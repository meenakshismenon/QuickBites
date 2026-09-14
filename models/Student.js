const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    rollNumber: {
      type: String,
      required: [true, 'Roll Number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Student Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      enum: [
        'Computer Science & Engineering',
        'Information Technology',
        'Electronics & Communication',
        'Mechanical Engineering',
        'Civil Engineering',
        'Data Science & AI',
      ],
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: [1, 'Semester must be at least 1'],
      max: [8, 'Semester cannot exceed 8'],
    },
    cgpa: {
      type: Number,
      default: 0.0,
      min: [0, 'CGPA cannot be negative'],
      max: [10, 'CGPA maximum is 10.0'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['Active', 'Graduated', 'Suspended', 'On Leave'],
      default: 'Active',
    },
    enrolledCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Virtual for formatted status and quick stats
studentSchema.virtual('courseCount').get(function () {
  return this.enrolledCourses ? this.enrolledCourses.length : 0;
});

module.exports = mongoose.model('Student', studentSchema);
