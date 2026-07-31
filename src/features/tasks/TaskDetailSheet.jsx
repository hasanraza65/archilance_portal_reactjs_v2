import React from "react";
import Sheet from "@/components/ui/Sheet";
import TaskDetailContent from "./TaskDetailContent";

const TaskDetailSheet = ({ taskId, onClose }) => (
  <Sheet open={Boolean(taskId)} onClose={onClose} widthClass="sm:max-w-2xl">
    {taskId && <TaskDetailContent taskId={taskId} onClose={onClose} />}
  </Sheet>
);

export default TaskDetailSheet;
