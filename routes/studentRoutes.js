const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Course = require('../models/Course');
const Grade = require('../models/Grade');

// 1. GET /api/students - List all students (Read)
router.get('/', async (req, res) => {
  try {
    const { search, department, semester, status, sortBy = 'createdAt', order = 'desc' } = req.query;
    const filter = {};

    if (department && department !== 'All') {
      filter.department = department;
    }
    if (semester && semester !== 'All') {
      filter.semester = Number(semester);
    }
    if (status && status !== 'All') {
      filter.status = status;
    }
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { rollNumber: searchRegex },
        { email: searchRegex },
      ];
    }

    const sortOption = {};
    sortOption[sortBy] = order === 'asc' ? 1 : -1;

    const students = await Student.find(filter)
      .populate('enrolledCourses', 'courseCode courseName credits')
      .sort(sortOption);

    res.status(200).json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. GET /api/students/:id - Get single student by ID (Read)
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('enrolledCourses');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const grades = await Grade.find({ student: student._id }).populate('course');

    res.status(200).json({
      success: true,
      data: {
        ...student.toObject(),
        grades,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. POST /api/students - Register a new student (Create)
router.post('/', async (req, res) => {
  try {
    const { rollNumber, name, email, department, semester, phone, status } = req.body;

    if (!rollNumber || !name || !email || !department || !semester) {
      return res.status(400).json({
        success: false,
        message: 'Please provide rollNumber, name, email, department, and semester',
      });
    }

    // Check existing roll number or email
    const existing = await Student.findOne({
      $or: [
        { rollNumber: rollNumber.trim().toUpperCase() },
        { email: email.trim().toLowerCase() },
      ],
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A student with this Roll Number or Email already exists',
      });
    }

    const newStudent = await Student.create({
      rollNumber: rollNumber.trim().toUpperCase(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      department,
      semester: Number(semester),
      phone: phone || '',
      status: status || 'Active',
      cgpa: 0.0,
      enrolledCourses: [],
    });

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: newStudent,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. PUT /api/students/:id - Update student details (Update)
router.put('/:id', async (req, res) => {
  try {
    const { rollNumber, name, email, department, semester, phone, status, cgpa } = req.body;

    // Check uniqueness if roll or email is changed
    if (rollNumber || email) {
      const conflict = await Student.findOne({
        _id: { $ne: req.params.id },
        $or: [
          ...(rollNumber ? [{ rollNumber: rollNumber.trim().toUpperCase() }] : []),
          ...(email ? [{ email: email.trim().toLowerCase() }] : []),
        ],
      });
      if (conflict) {
        return res.status(409).json({
          success: false,
          message: 'Another student already has this Roll Number or Email',
        });
      }
    }

    const updatePayload = {};
    if (rollNumber) updatePayload.rollNumber = rollNumber.trim().toUpperCase();
    if (name) updatePayload.name = name.trim();
    if (email) updatePayload.email = email.trim().toLowerCase();
    if (department) updatePayload.department = department;
    if (semester !== undefined) updatePayload.semester = Number(semester);
    if (phone !== undefined) updatePayload.phone = phone;
    if (status) updatePayload.status = status;
    if (cgpa !== undefined) updatePayload.cgpa = Number(cgpa);

    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    ).populate('enrolledCourses', 'courseCode courseName credits');

    if (!updatedStudent) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Student details updated successfully',
      data: updatedStudent,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. PATCH /api/students/:id/status - Toggle student status (Update)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Graduated', 'Suspended', 'On Leave'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Allowed: Active, Graduated, Suspended, On Leave',
      });
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.status(200).json({
      success: true,
      message: `Student status updated to ${status}`,
      data: student,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. DELETE /api/students/:id - Remove student record (Delete)
router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Decrement enrolledCount on all courses the student was enrolled in
    if (student.enrolledCourses && student.enrolledCourses.length > 0) {
      await Course.updateMany(
        { _id: { $in: student.enrolledCourses } },
        { $inc: { enrolledCount: -1 } }
      );
    }

    // Delete associated grades
    await Grade.deleteMany({ student: student._id });

    // Delete student
    await Student.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `Student '${student.name}' (${student.rollNumber}) deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. POST /api/students/:id/enroll - Enroll student in a course (Create/Update)
router.post('/:id/enroll', async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId is required' });
    }

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Check if already enrolled
    if (student.enrolledCourses.some((c) => c.toString() === courseId)) {
      return res.status(400).json({ success: false, message: 'Student is already enrolled in this course' });
    }

    // Check capacity
    if (course.enrolledCount >= course.capacity) {
      return res.status(400).json({ success: false, message: 'Course has reached maximum student capacity' });
    }

    student.enrolledCourses.push(course._id);
    await student.save();

    course.enrolledCount += 1;
    await course.save();

    const populatedStudent = await Student.findById(student._id).populate('enrolledCourses');

    res.status(200).json({
      success: true,
      message: `Enrolled successfully in ${course.courseCode} - ${course.courseName}`,
      data: populatedStudent,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 8. DELETE /api/students/:id/enroll/:courseId - Unenroll student from course (Delete/Update)
router.delete('/:id/enroll/:courseId', async (req, res) => {
  try {
    const { id, courseId } = req.params;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const courseIndex = student.enrolledCourses.findIndex((c) => c.toString() === courseId);
    if (courseIndex === -1) {
      return res.status(400).json({ success: false, message: 'Student is not enrolled in this course' });
    }

    student.enrolledCourses.splice(courseIndex, 1);
    await student.save();

    await Course.findByIdAndUpdate(courseId, { $inc: { enrolledCount: -1 } });

    // Optional: remove grade record for this course
    await Grade.deleteOne({ student: id, course: courseId });

    res.status(200).json({
      success: true,
      message: 'Student unenrolled from course successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
