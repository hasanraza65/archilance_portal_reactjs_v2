import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import TaskDetailContent from "./TaskDetailContent";

/** Deep-linkable full page (new tab, mobile) — same content as the desktop Sheet. */
const TaskFullPage = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto min-h-[calc(100vh-3.5rem)] lg:min-h-screen bg-[var(--surface-raised)] lg:my-4 lg:rounded-2xl lg:border lg:border-[var(--line-subtle)] lg:shadow-card">
      <TaskDetailContent taskId={taskId} onClose={() => navigate(-1)} showOpenFull={false} />
    </div>
  );
};

export default TaskFullPage;
