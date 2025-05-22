import mongoose , {Schema} from 'mongoose';

const videoSchema = newSchema(
    {
        videoFile : {
            type: String,
            required: true,
        },

        thumbnail : {
            type: String,
            required: true,
        },

        title : {
            type: String,
            required: true,
        },

        description : {
            type: String,
            required: true,
        },

        duration : {
            type: Number,
            required: true,
        },

        views:{
            type: Number,
            default: 0,
        },

        isPublished:{
            type: Boolean,
            default: false,
        },

        owner:{
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

    },{timestamps: true}
)

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model('Video', videoSchema);