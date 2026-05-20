const labels = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

export default function StatusBadge({ status, overdue }) {
  return (
    <span className={`badge badge-${status}${overdue ? ' badge-overdue' : ''}`}>
      {overdue ? 'Overdue' : labels[status] || status}
    </span>
  );
}
