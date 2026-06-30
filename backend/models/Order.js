const mongoose = require('mongoose');

const geoJSONPointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
    required: true
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true
  }
}, { _id: false });

const orderSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: [true, 'Please provide customer name'],
      trim: true,
    },
    deliveryAddress: {
      type: String,
      required: [true, 'Please provide delivery address'],
      trim: true,
    },
    pickupLocation: {
      type: geoJSONPointSchema,
      required: [true, 'Please provide pickup coordinates'],
    },
    deliveryLocation: {
      type: geoJSONPointSchema,
      required: [true, 'Please provide delivery coordinates'],
    },
    items: {
      type: [String],
      required: [true, 'Please provide delivery items'],
      validate: [
        (val) => val.length > 0,
        'Order must contain at least one item',
      ],
    },
    fare: {
      type: Number,
      required: [true, 'Please provide delivery fare'],
      min: [0, 'Fare cannot be negative'],
    },
    status: {
      type: String,
      enum: ['pending', 'assigned', 'picked_up', 'delivered', 'cancelled'],
      default: 'pending',
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Apply 2dsphere indexes on pickup and delivery locations in case we search by location
orderSchema.index({ pickupLocation: '2dsphere' });
orderSchema.index({ deliveryLocation: '2dsphere' });

module.exports = mongoose.model('Order', orderSchema);
