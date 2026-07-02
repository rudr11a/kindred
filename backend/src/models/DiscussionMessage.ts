import { Schema, model, Document, Types } from 'mongoose';

export interface IReaction {
  userId: Types.ObjectId;
  emoji: string;
}

export interface IDiscussionMessage extends Document {
  teamId: Types.ObjectId;
  senderId: Types.ObjectId;
  message: string;
  reactions: IReaction[];
  createdAt: Date;
}

const discussionMessageSchema = new Schema<IDiscussionMessage>(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    reactions: {
      type: [
        {
          userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
          },
          emoji: {
            type: String,
            required: true,
          },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const DiscussionMessage = model<IDiscussionMessage>('DiscussionMessage', discussionMessageSchema);
export default DiscussionMessage;
