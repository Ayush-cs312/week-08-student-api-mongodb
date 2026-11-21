const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true,
      minlength: [2, 'name must be at least 2 characters'],
      maxlength: [60, 'name must be at most 60 characters'],
    },
    department: {
      type: String,
      required: [true, 'department is required'],
      trim: true,
      minlength: [2, 'department must be at least 2 characters'],
      maxlength: [60, 'department must be at most 60 characters'],
    },
    semester: {
      type: Number,
      required: [true, 'semester is required'],
      min: [1, 'semester must be between 1 and 8'],
      max: [8, 'semester must be between 1 and 8'],
      validate: {
        validator: Number.isInteger,
        message: 'semester must be a whole number',
      },
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
    toJSON: {
      // Send "id" instead of MongoDB's "_id", and hide the internal "__v" field
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('Student', studentSchema);
