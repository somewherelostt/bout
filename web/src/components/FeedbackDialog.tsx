import { Check, X } from "lucide-react";
import { useState } from "react";

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
}

export function FeedbackDialog({ open, onClose }: FeedbackDialogProps) {
  const [sent, setSent] = useState(false);

  if (!open) return null;

  return (
    <div className="dialog-layer" role="presentation" onMouseDown={onClose}>
      <div
        className="dialog-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="icon-button dialog-close" type="button" onClick={onClose}>
          <X size={18} />
          <span className="sr-only">Close</span>
        </button>
        {sent ? (
          <div className="dialog-success">
            <span><Check size={22} /></span>
            <h2 id="feedback-title">Feedback received.</h2>
            <p>Thanks for helping make every bout sharper.</p>
            <button className="primary-button" type="button" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSent(true);
            }}
          >
            <span className="eyebrow">QUICK NOTE</span>
            <h2 id="feedback-title">What should we improve?</h2>
            <p>Tell us what felt confusing, slow, or unexpectedly good.</p>
            <textarea aria-label="Feedback" placeholder="Write a few words…" autoFocus required />
            <button className="primary-button" type="submit">Send feedback</button>
          </form>
        )}
      </div>
    </div>
  );
}
