const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    internalMarks: {
      type: Number,
      required: [true, 'Internal marks are required'],
      min: [0, 'Marks cannot be negative'],
      max: [40, 'Internal marks maximum is 40'],
      default: 0,
    },
    assignmentMarks: {
      type: Number,
      required: [true, 'Assignment marks are required'],
      min: [0, 'Marks cannot be negative'],
      max: [10, 'Assignment marks maximum is 10'],
      default: 0,
    },
    examMarks: {
      type: Number,
      required: [true, 'Exam marks are required'],
      min: [0, 'Marks cannot be negative'],
      max: [50, 'Exam marks maximum is 50'],
      default: 0,
    },
    totalMarks: {
      type: Number,
      min: 0,
      max: 100,
    },
    grade: {
      type: String,
      enum: ['O', 'A+', 'A', 'B+', 'B', 'C', 'F'],
    },
    gradePoint: {
      type: Number,
      min: 0,
      max: 10,
    },
    semester: {
      type: Number,
      min: 1,
      max: 8,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: One grade entry per student per course
gradeSchema.index({ student: 1, course: 1 }, { unique: true });

// Pre-save hook to compute totalMarks, grade, and gradePoint automatically
gradeSchema.pre('save', function (next) {
  this.totalMarks = Number(this.internalMarks) + Number(this.assignmentMarks) + Number(this.examMarks);
  
  const score = this.totalMarks;
  if (score >= 90) {
    this.grade = 'O';
    this.gradePoint = 10;
  } else if (score >= 80) {
    this.grade = 'A+';
    this.gradePoint = 9;
  } else if (score >= 70) {
    this.grade = 'A';
    this.gradePoint = 8;
  } else if (score >= 60) {
    this.grade = 'B+';
    this.gradePoint = 7;
  } else if (score >= 50) {
    this.grade = 'B';
    this.gradePoint = 6;
  } else if (score >= 40) {
    this.grade = 'C';
    this.gradePoint = 5;
  } else {
    this.grade = 'F';
    this.gradePoint = 0;
  }
  next();
});

module.exports = mongoose.model('Grade', gradeSchema);
