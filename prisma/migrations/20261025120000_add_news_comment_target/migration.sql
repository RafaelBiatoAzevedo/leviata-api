-- Allow news to use the existing moderated comments and notifications workflow.
ALTER TYPE "CommentTarget" ADD VALUE 'NEWS';
