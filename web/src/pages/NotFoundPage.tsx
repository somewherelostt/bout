import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <section className="not-found">
      <span className="eyebrow">OUT OF BOUNDS</span>
      <h1>That bout does not exist.</h1>
      <p>The link may have expired or the review moved to a private workspace.</p>
      <button className="primary-button" type="button" onClick={() => navigate("/")}><ArrowLeft size={16} /> Back to Bout</button>
    </section>
  );
}
