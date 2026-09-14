const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Student = require('../models/Student');
const Grade = require('../models/Grade');

// 1. GET /api/courses - List all courses (Read)
router.get('/', async (req, res) => {
  try {
    const { department, semester, search } = req.query;
    const filter = {};

    if (department && department !== 'All') {
      filter.department = department;
    }
    if (semester && semester !== 'All') {
      filter.semester = Number(semester);
    }
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { courseCode: searchRegex },
        { courseName: searchRegex },
        { instructor: searchRegex },
      ];
    }

    const courses = await Course.find(filter).sort({ courseCode: 1 });

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. GET /api/courses/:id - Get single course (Read)
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Find enrolled students
    const enrolledStudents = await Student.find({ enrolledCourses: course._id })
      .select('name rollNumber email department cgpa');

    res.status(200).json({
      success: true,
      data: {
        ...course.toObject(),
        enrolledStudents,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. POST /api/courses - Create new course (Create)
router.post('/', async (req, res) => {
  try {
    const { courseCode, courseName, department, credits, instructor, semester, capacity, description } = req.body;

    if (!courseCode || !courseName || !department || !credits || !instructor || !semester) {
      return res.status(400).json({
        success: false,
        message: 'courseCode, courseName, department, credits, instructor, and semester are required',
      });
    }

    const existing = await Course.findOne({ courseCode: courseCode.trim().toUpperCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Course with code ${courseCode} already exists`,
      });
    }

    const newCourse = await Course.create({
      courseCode: courseCode.trim().toUpperCase(),
      courseName: courseName.trim(),
      department,
      credits: Number(credits),
      instructor: instructor.trim(),
      semester: Number(semester),
      capacity: capacity ? Number(capacity) : 60,
      description: description || '',
      enrolledCount: 0,
    });

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: newCourse,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. PUT /api/courses/:id - Update course details (Update)
router.put('/:id', async (req, res) => {
  try {
    const { courseCode, courseName, department, credits, instructor, semester, capacity, description } = req.body;

    if (courseCode) {
      const conflict = await Course.findOne({
        _id: { $ne: req.params.id },
        courseCode: courseCode.trim().toUpperCase(),
      });
      if (conflict) {
        return res.status(409).json({
          success: false,
          message: `Another course with code ${courseCode} already exists`,
        });
      }
    }

    const updatePayload = {};
    if (courseCode) updatePayload.courseCode = courseCode.trim().toUpperCase();
    if (courseName) updatePayload.courseName = courseName.trim();
    if (department) updatePayload.department = department;
    if (credits !== undefined) updatePayload.credits = Number(credits);
    if (instructor) updatePayload.instructor = instructor.trim();
    if (semester !== undefined) updatePayload.semester = Number(semester);
    if (capacity !== undefined) updatePayload.capacity = Number(capacity);
    if (description !== undefined) updatePayload.description = description.trim();

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: updatedCourse,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. DELETE /api/courses/:id - Delete course (Delete)
router.delete('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Remove course from all enrolled students
    await Student.updateMany(
      { enrolledCourses: course._id },
      { $pull: { enrolledCourses: course._id } }
    );

    // Delete related grades
    await Grade.deleteMany({ course: course._id });

    // Delete course
    await Course.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `Course '${course.courseCode} - ${course.courseName}' deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
