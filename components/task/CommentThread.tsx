import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/ListSkeleton";
import { formatDateTimeShort } from "@/lib/format/calendarDate";
import type { CommentResponse } from "@/lib/api/schemas";

interface CommentThreadProps {
  comments: CommentResponse[] | undefined;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

/** List of comments for a task, used inside `TaskDetailDialog`. */
export function CommentThread({ comments, loading, error, onRetry }: CommentThreadProps) {
  if (loading) {
    return <ListSkeleton rows={2} />;
  }

  if (error) {
    return <EmptyState variant="error" title="Couldn't load comments" onRetry={onRetry} />;
  }

  if (!comments || comments.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No comments yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {comments.map((comment) => (
        <li key={comment.id} className="flex flex-col gap-0.5 rounded-lg bg-muted px-3 py-2">
          <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
          <p className="text-xs text-muted-foreground">{formatDateTimeShort(comment.createdAt)}</p>
        </li>
      ))}
    </ul>
  );
}
