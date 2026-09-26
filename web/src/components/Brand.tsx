export function Brand() {
  return (
    <div className="brand" aria-label="Bout home">
      <svg
        className="brand-mark"
        viewBox="0 0 42 42"
        role="img"
        aria-hidden="true"
      >
        <path d="M21 2 38 11v20l-17 9L4 31V11L21 2Z" fill="currentColor" />
        <path
          d="m21 8 10.5 5.6L21 19.2 10.5 13.6 21 8Zm0 14.6 10.5-5.5v10.8L21 33.5V22.6Z"
          fill="var(--paper)"
        />
      </svg>
      <div>
        <strong>Bout</strong>
        <span>Better code wins</span>
      </div>
    </div>
  );
}
