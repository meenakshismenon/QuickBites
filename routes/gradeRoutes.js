const express = require('express');
const router = express.Router();
const Grade = require('../models/Grade');
const Student = require('../models/Student');
const Course = require('../models/Course');

// Helper function to recalculate and update a student's CGPA
const recalculateStudentCGPA = async (studentId) => {
  try {
    const grades = await Grade.find({ student: studentId }).populate('course');
    if (!grades || grades.length === 0) {
      await Student.findByIdAndUpdate(studentId, { cgpa: 0.0 });
      return 0.0;
    }

    let totalPoints = 0;
    let totalCredits = 0;

    for (const g of grades) {
      const credits = g.course && g.course.credits ? g.course.credits : 3;
      const points = g.gradePoint !== undefined ? g.gradePoint : 0;
      totalPoints += points * credits;
      totalCredits += credits;
    }

    const calculatedCGPA = totalCredits > 0 ? Number((totalPoints / totalCredits).toFixed(2)) : 0.0;
    await Student.findByIdAndUpdate(studentId, { cgpa: calculatedCGPA });
    return calculatedCGPA;
  } catch (err) {
    console.error('Error recalculating CGPA:', err);
    return null;
  }
};

// 1. GET /api/grades - List all grades (Read)
router.get('/', async (req, res) => {
  try {
    const { student, course } = req.query;
    const filter = {};
    if (student) filter.student = student;
    if (course) filter.course = course;

    const grades = await Grade.find(filter)
      .populate('student', 'name rollNumber department')
      .populate('course', 'courseCode courseName credits');

    res.status(200).json({
      success: true,
      count: grades.length,
      data: grades,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. GET /api/grades/student/:studentId - Get transcript for a student (Read)
router.get('/student/:studentId', async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const grades = await Grade.find({ student: student._id })
      .populate('course', 'courseCode courseName credits semester department');

    let totalCreditsEarned = 0;
    let totalPossibleCredits = 0;

    grades.forEach((g) => {
      const creds = g.course ? g.course.credits : 0;
      totalPossibleCredits += creds;
      if (g.grade !== 'F') {
        totalCreditsEarned += creds;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        student: {
          _id: student._id,
          name: student.name,
          rollNumber: student.rollNumber,
          department: student.department,
          semester: student.semester,
          cgpa: student.cgpa,
        },
        transcript: grades,
        summary: {
          coursesCount: grades.length,
          totalCreditsEarned,
          totalPossibleCredits,
          cgpa: student.cgpa,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. POST /api/grades - Record or update marks (Create/Update with auto-grade and CGPA update)
router.post('/', async (req, res) => {
  try {
    const { studentId, courseId, internalMarks = 0, assignmentMarks = 0, examMarks = 0, semester } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'studentId and courseId are required',
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Auto enroll student if not enrolled
    if (!student.enrolledCourses.some((c) => c.toString() === courseId)) {
      student.enrolledCourses.push(course._id);
      await student.save();
      await Course.findByIdAndUpdate(courseId, { $inc: { enrolledCount: 1 } });
    }

    // Upsert grade
    let gradeRecord = await Grade.findOne({ student: studentId, course: courseId });

    if (gradeRecord) {
      gradeRecord.internalMarks = Number(internalMarks);
      gradeRecord.assignmentMarks = Number(assignmentMarks);
      gradeRecord.examMarks = Number(examMarks);
      if (semester) gradeRecord.semester = Number(semester);
      await gradeRecord.save();
    } else {
      gradeRecord = await Grade.create({
        student: studentId,
        course: courseId,
        internalMarks: Number(internalMarks),
        assignmentMarks: Number(assignmentMarks),
        examMarks: Number(examMarks),
        semester: semester ? Number(semester) : student.semester,
      });
    }

    // Recalculate CGPA
    const newCGPA = await recalculateStudentCGPA(studentId);

    const populatedGrade = await Grade.findById(gradeRecord._id)
      .populate('student', 'name rollNumber')
      .populate('course', 'courseCode courseName credits');

    res.status(200).json({
      success: true,
      message: `Marks recorded. Grade: ${gradeRecord.grade} (${gradeRecord.totalMarks}/100), New CGPA: ${newCGPA}`,
      data: populatedGrade,
      updatedCGPA: newCGPA,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. DELETE /api/grades/:id - Remove a grade record (Delete)
router.delete('/:id', async (req, res) => {
  try {
    const grade = await Grade.findById(req.params.id);
    if (!grade) {
      return res.status(404).json({ success: false, message: 'Grade record not found' });
    }

    const studentId = grade.student;
    await Grade.findByIdAndDelete(req.params.id);

    // Recalculate CGPA
    const updatedCGPA = await recalculateStudentCGPA(studentId);

    res.status(200).json({
      success: true,
      message: 'Grade record deleted successfully',
      updatedCGPA,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
