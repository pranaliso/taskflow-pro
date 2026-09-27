import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "taskflow-pro-vfinal";

const defaultTasks = [
  {
    id: 1,
    title: "Complete React project",
    description: "Finish the TaskFlow productivity dashboard.",
    priority: "High",
    category: "Projects",
    tags: ["React", "Portfolio"],
    dueDate: new Date().toISOString().slice(0, 10),
    estimated: 120,
    status: "In Progress",
    important: true,
    completed: false,
    createdAt: Date.now(),
    completedAt: null,
    subtasks: [
      { id: 11, title: "Build dashboard", done: true },
      { id: 12, title: "Add analytics", done: false },
      { id: 13, title: "Test application", done: false },
    ],
  },
  {
    id: 2,
    title: "Practice DSA",
    description: "Solve array and string problems.",
    priority: "Medium",
    category: "Study",
    tags: ["Java", "DSA"],
    dueDate: new Date().toISOString().slice(0, 10),
    estimated: 90,
    status: "Todo",
    important: false,
    completed: false,
    createdAt: Date.now(),
    completedAt: null,
    subtasks: [],
  },
  {
    id: 3,
    title: "Revise DBMS",
    description: "Revise normalization and transactions.",
    priority: "Low",
    category: "Study",
    tags: ["DBMS"],
    dueDate: "",
    estimated: 60,
    status: "Completed",
    important: false,
    completed: true,
    createdAt: Date.now() - 86400000,
    completedAt: Date.now(),
    subtasks: [],
  },
];

function getInitialData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const data = JSON.parse(saved);

      return {
        tasks: data.tasks || defaultTasks,
        theme: data.theme || "dark",
        xp: data.xp || 120,
        streak: data.streak || 3,
        sessions: data.sessions || 0,
      };
    }
  } catch {
    console.log("Unable to load saved data");
  }

  return {
    tasks: defaultTasks,
    theme: "dark",
    xp: 120,
    streak: 3,
    sessions: 0,
  };
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(date) {
  if (!date) return "No deadline";

  const d = new Date(date + "T00:00:00");

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDay(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function TodoList() {
  const initial = getInitialData();

  const [tasks, setTasks] = useState(initial.tasks);
  const [theme, setTheme] = useState(initial.theme);
  const [xp, setXp] = useState(initial.xp);
  const [streak, setStreak] = useState(initial.streak);
  const [sessions, setSessions] = useState(initial.sessions);

  const [page, setPage] = useState("dashboard");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [toast, setToast] = useState("");
  const [lastDeleted, setLastDeleted] = useState(null);

  const [selectedTask, setSelectedTask] = useState(null);

  const [calendarDate, setCalendarDate] = useState(new Date());

  const [focusMode, setFocusMode] = useState("Focus");
  const [focusTime, setFocusTime] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "Medium",
    category: "Study",
    tags: "",
    dueDate: "",
    estimated: 30,
    status: "Todo",
    important: false,
    subtasks: "",
  });

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        tasks,
        theme,
        xp,
        streak,
        sessions,
      })
    );
  }, [tasks, theme, xp, streak, sessions]);

  useEffect(() => {
    document.body.className = theme === "dark" ? "dark-body" : "light-body";
  }, [theme]);

  useEffect(() => {
    if (!timerRunning) return;

    const timer = setInterval(() => {
      setFocusTime((time) => {
        if (time <= 1) {
          clearInterval(timer);
          setTimerRunning(false);
          setSessions((s) => s + 1);
          setXp((x) => x + 25);
          showToast("Focus session completed! +25 XP 🎉");
          return 0;
        }

        return time - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timerRunning]);

  useEffect(() => {
    const keyboard = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return;
      }

      if (e.key.toLowerCase() === "n") {
        openNewTask();
      }

      if (e.key === "/") {
        e.preventDefault();
        document.querySelector(".global-search")?.focus();
      }

      if (e.key.toLowerCase() === "d") {
        setPage("dashboard");
      }
    };

    window.addEventListener("keydown", keyboard);

    return () => window.removeEventListener("keydown", keyboard);
  }, []);

  function showToast(message) {
    setToast(message);

    setTimeout(() => {
      setToast("");
    }, 2500);
  }

  function openNewTask() {
    setEditingTask(null);

    setForm({
      title: "",
      description: "",
      priority: "Medium",
      category: "Study",
      tags: "",
      dueDate: todayString(),
      estimated: 30,
      status: "Todo",
      important: false,
      subtasks: "",
    });

    setShowModal(true);
  }

  function openEditTask(task) {
    setEditingTask(task);

    setForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      category: task.category,
      tags: task.tags.join(", "),
      dueDate: task.dueDate,
      estimated: task.estimated,
      status: task.status,
      important: task.important,
      subtasks: task.subtasks.map((s) => s.title).join("\n"),
    });

    setShowModal(true);
  }

  function saveTask(e) {
    e.preventDefault();

    if (!form.title.trim()) {
      showToast("Please enter a task title");
      return;
    }

    const subtasks = form.subtasks
      .split("\n")
      .map((item, index) => item.trim())
      .filter(Boolean)
      .map((title, index) => {
        const old = editingTask?.subtasks?.[index];

        return {
          id: old?.id || Date.now() + index,
          title,
          done: old?.done || false,
        };
      });

    if (editingTask) {
      setTasks((oldTasks) =>
        oldTasks.map((task) =>
          task.id === editingTask.id
            ? {
                ...task,
                ...form,
                tags: form.tags
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
                estimated: Number(form.estimated),
                subtasks,
                completed: form.status === "Completed",
                completedAt:
                  form.status === "Completed"
                    ? task.completedAt || Date.now()
                    : null,
              }
            : task
        )
      );

      showToast("Task updated successfully");
    } else {
      const newTask = {
        id: Date.now(),
        title: form.title.trim(),
        description: form.description,
        priority: form.priority,
        category: form.category,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        dueDate: form.dueDate,
        estimated: Number(form.estimated),
        status: form.status,
        important: form.important,
        completed: form.status === "Completed",
        createdAt: Date.now(),
        completedAt: form.status === "Completed" ? Date.now() : null,
        subtasks,
      };

      setTasks((old) => [newTask, ...old]);
      setXp((x) => x + 10);

      showToast("New task created! +10 XP");
    }

    setShowModal(false);
  }

  function toggleTask(id) {
    setTasks((oldTasks) =>
      oldTasks.map((task) => {
        if (task.id !== id) return task;

        const completed = !task.completed;

        return {
          ...task,
          completed,
          status: completed ? "Completed" : "Todo",
          completedAt: completed ? Date.now() : null,
        };
      })
    );

    const task = tasks.find((t) => t.id === id);

    if (task && !task.completed) {
      setXp((x) => x + 20);
      showToast("Task completed! +20 XP 🎯");
    }
  }

  function deleteTask(id) {
    const task = tasks.find((item) => item.id === id);

    setLastDeleted(task);
    setTasks((old) => old.filter((item) => item.id !== id));

    showToast("Task deleted. You can undo it.");
  }

  function undoDelete() {
    if (!lastDeleted) return;

    setTasks((old) => [lastDeleted, ...old]);
    setLastDeleted(null);

    showToast("Task restored");
  }

  function toggleImportant(id) {
    setTasks((old) =>
      old.map((task) =>
        task.id === id
          ? {
              ...task,
              important: !task.important,
            }
          : task
      )
    );
  }

  function toggleSubtask(taskId, subtaskId) {
    setTasks((old) =>
      old.map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks.map((subtask) =>
                subtask.id === subtaskId
                  ? {
                      ...subtask,
                      done: !subtask.done,
                    }
                  : subtask
              ),
            }
          : task
      )
    );
  }

  function updateStatus(id, status) {
    setTasks((old) =>
      old.map((task) =>
        task.id === id
          ? {
              ...task,
              status,
              completed: status === "Completed",
              completedAt: status === "Completed" ? Date.now() : null,
            }
          : task
      )
    );
  }

  function clearCompleted() {
    setTasks((old) => old.filter((task) => !task.completed));
    showToast("Completed tasks cleared");
  }

  function clearAll() {
    if (!window.confirm("Delete all tasks?")) return;

    setTasks([]);
    showToast("All tasks deleted");
  }

  function exportData() {
    const data = JSON.stringify(
      {
        tasks,
        xp,
        streak,
        sessions,
      },
      null,
      2
    );

    const blob = new Blob([data], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "taskflow-backup.json";
    a.click();

    URL.revokeObjectURL(url);

    showToast("Backup exported");
  }

  function importData(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);

        if (Array.isArray(data.tasks)) {
          setTasks(data.tasks);
          setXp(data.xp || 0);
          setStreak(data.streak || 0);
          setSessions(data.sessions || 0);

          showToast("Backup imported successfully");
        } else {
          showToast("Invalid backup file");
        }
      } catch {
        showToast("Invalid JSON file");
      }
    };

    reader.readAsText(file);
  }

  function resetTimer(type = "Focus") {
    setTimerRunning(false);
    setFocusMode(type);

    if (type === "Focus") {
      setFocusTime(25 * 60);
    } else if (type === "Short Break") {
      setFocusTime(5 * 60);
    } else {
      setFocusTime(15 * 60);
    }
  }

  const completed = tasks.filter((task) => task.completed).length;
  const active = tasks.filter((task) => !task.completed).length;
  const important = tasks.filter((task) => task.important).length;

  const today = todayString();

  const todayTasks = tasks.filter((task) => task.dueDate === today);

  const overdue = tasks.filter(
    (task) => !task.completed && task.dueDate && task.dueDate < today
  ).length;

  const progress =
    tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);

  const dailyGoal = 5;
  const dailyCompleted = todayTasks.filter((task) => task.completed).length;

  const level = Math.floor(xp / 100) + 1;
  const levelProgress = xp % 100;

  const categories = [
    "All",
    ...new Set(tasks.map((task) => task.category)),
  ];

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (search.trim()) {
      const query = search.toLowerCase();

      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query) ||
          task.category.toLowerCase().includes(query) ||
          task.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    if (filter === "Active") {
      result = result.filter((task) => !task.completed);
    }

    if (filter === "Completed") {
      result = result.filter((task) => task.completed);
    }

    if (filter === "Important") {
      result = result.filter((task) => task.important);
    }

    if (filter === "Today") {
      result = result.filter((task) => task.dueDate === today);
    }

    if (filter === "Overdue") {
      result = result.filter(
        (task) => !task.completed && task.dueDate && task.dueDate < today
      );
    }

    if (priorityFilter !== "All") {
      result = result.filter(
        (task) => task.priority === priorityFilter
      );
    }

    if (categoryFilter !== "All") {
      result = result.filter(
        (task) => task.category === categoryFilter
      );
    }

    if (sortBy === "Newest") {
      result.sort((a, b) => b.createdAt - a.createdAt);
    }

    if (sortBy === "Oldest") {
      result.sort((a, b) => a.createdAt - b.createdAt);
    }

    if (sortBy === "Priority") {
      const weight = {
        High: 3,
        Medium: 2,
        Low: 1,
      };

      result.sort(
        (a, b) => weight[b.priority] - weight[a.priority]
      );
    }

    if (sortBy === "Deadline") {
      result.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;

        return a.dueDate.localeCompare(b.dueDate);
      });
    }

    return result;
  }, [
    tasks,
    search,
    filter,
    priorityFilter,
    categoryFilter,
    sortBy,
    today,
  ]);

  const categoryStats = categories
    .filter((category) => category !== "All")
    .map((category) => {
      const categoryTasks = tasks.filter(
        (task) => task.category === category
      );

      const done = categoryTasks.filter(
        (task) => task.completed
      ).length;

      return {
        category,
        total: categoryTasks.length,
        done,
        percent:
          categoryTasks.length === 0
            ? 0
            : Math.round((done / categoryTasks.length) * 100),
      };
    });

  const achievements = [
    {
      icon: "🌱",
      title: "First Step",
      text: "Create your first task",
      unlocked: tasks.length > 0,
    },
    {
      icon: "🎯",
      title: "Task Crusher",
      text: "Complete 5 tasks",
      unlocked: completed >= 5,
    },
    {
      icon: "🔥",
      title: "On Fire",
      text: "Maintain a productivity streak",
      unlocked: streak >= 3,
    },
    {
      icon: "⭐",
      title: "Important",
      text: "Mark an important task",
      unlocked: important > 0,
    },
    {
      icon: "🏆",
      title: "Level 5",
      text: "Reach level 5",
      unlocked: level >= 5,
    },
    {
      icon: "⏱️",
      title: "Focused",
      text: "Complete a focus session",
      unlocked: sessions > 0,
    },
  ];

  function renderDashboard() {
    return (
      <div className="page-content">
        <div className="welcome-row">
          <div>
            <p className="eyebrow">PRODUCTIVITY CENTER</p>
            <h1>Good evening, Pranali 👋</h1>
            <p className="muted">
              Organize your work, focus on what matters and track your progress.
            </p>
          </div>

          <button className="primary-btn" onClick={openNewTask}>
            + New Task
          </button>
        </div>

        <div className="stats-grid">
          <StatCard
            icon="📋"
            label="Total Tasks"
            value={tasks.length}
            color="blue"
          />

          <StatCard
            icon="✅"
            label="Completed"
            value={completed}
            color="green"
          />

          <StatCard
            icon="⚡"
            label="Active"
            value={active}
            color="orange"
          />

          <StatCard
            icon="⚠️"
            label="Overdue"
            value={overdue}
            color="red"
          />
        </div>

        <div className="dashboard-grid">
          <div className="panel progress-panel">
            <div className="panel-title">
              <div>
                <p className="eyebrow">OVERVIEW</p>
                <h2>Productivity Progress</h2>
              </div>

              <span className="big-percent">{progress}%</span>
            </div>

            <div className="progress-track large">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="progress-info">
              <span>{completed} tasks completed</span>
              <span>{active} remaining</span>
            </div>

            <div className="mini-stats">
              <div>
                <span>🔥</span>
                <strong>{streak} days</strong>
                <small>Streak</small>
              </div>

              <div>
                <span>⭐</span>
                <strong>{xp} XP</strong>
                <small>Experience</small>
              </div>

              <div>
                <span>🏆</span>
                <strong>Level {level}</strong>
                <small>Current Level</small>
              </div>
            </div>
          </div>

          <div className="panel goal-panel">
            <div className="panel-title">
              <div>
                <p className="eyebrow">TODAY</p>
                <h2>Daily Goal</h2>
              </div>

              <span className="goal-icon">🎯</span>
            </div>

            <div className="goal-circle">
              <div>
                <strong>{Math.min(dailyCompleted, dailyGoal)}</strong>
                <span>/{dailyGoal}</span>
              </div>
            </div>

            <p className="goal-text">
              {dailyCompleted >= dailyGoal
                ? "Daily goal completed! 🎉"
                : `${dailyGoal - dailyCompleted} more tasks to reach your goal.`}
            </p>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="panel">
            <div className="panel-title">
              <div>
                <p className="eyebrow">UPCOMING</p>
                <h2>Today's Tasks</h2>
              </div>

              <button
                className="text-btn"
                onClick={() => {
                  setPage("tasks");
                  setFilter("Today");
                }}
              >
                View all →
              </button>
            </div>

            {todayTasks.length === 0 ? (
              <EmptyState
                icon="☀️"
                title="No tasks for today"
                text="Add a task with today's deadline."
              />
            ) : (
              <div className="compact-list">
                {todayTasks.slice(0, 5).map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    onEdit={openEditTask}
                    onDelete={deleteTask}
                    onImportant={toggleImportant}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-title">
              <div>
                <p className="eyebrow">CATEGORIES</p>
                <h2>Progress by Category</h2>
              </div>
            </div>

            <div className="category-list">
              {categoryStats.length === 0 ? (
                <EmptyState
                  icon="📂"
                  title="No categories"
                  text="Create a task to see category statistics."
                />
              ) : (
                categoryStats.map((item) => (
                  <div className="category-stat" key={item.category}>
                    <div className="category-stat-head">
                      <span>{item.category}</span>
                      <strong>
                        {item.done}/{item.total}
                      </strong>
                    </div>

                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="panel quick-panel">
          <div>
            <p className="eyebrow">QUICK ACTIONS</p>
            <h2>What do you want to do?</h2>
          </div>

          <div className="quick-actions">
            <button onClick={openNewTask}>➕ Create Task</button>
            <button onClick={() => setPage("kanban")}>📌 Open Kanban</button>
            <button onClick={() => setPage("calendar")}>📅 Calendar</button>
            <button onClick={() => setPage("focus")}>⏱️ Focus Mode</button>
            <button onClick={() => setPage("analytics")}>📊 Analytics</button>
          </div>
        </div>
      </div>
    );
  }

  function renderTasks() {
    return (
      <div className="page-content">
        <div className="page-header">
          <div>
            <p className="eyebrow">TASK MANAGEMENT</p>
            <h1>All Tasks</h1>
            <p className="muted">
              Manage, organize and prioritize everything in one place.
            </p>
          </div>

          <button className="primary-btn" onClick={openNewTask}>
            + New Task
          </button>
        </div>

        <div className="filter-panel">
          <input
            className="global-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search tasks, tags, categories..."
          />

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option>All</option>
            <option>Active</option>
            <option>Completed</option>
            <option>Important</option>
            <option>Today</option>
            <option>Overdue</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option>All</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option>Newest</option>
            <option>Oldest</option>
            <option>Priority</option>
            <option>Deadline</option>
          </select>
        </div>

        <div className="task-toolbar">
          <span>
            Showing <strong>{filteredTasks.length}</strong> tasks
          </span>

          <div>
            <button className="small-btn" onClick={clearCompleted}>
              Clear completed
            </button>

            <button className="small-btn danger" onClick={clearAll}>
              Clear all
            </button>
          </div>
        </div>

        <div className="task-list">
          {filteredTasks.length === 0 ? (
            <EmptyState
              icon="🔎"
              title="No tasks found"
              text="Try changing your filters or create a new task."
            />
          ) : (
            filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onEdit={openEditTask}
                onDelete={deleteTask}
                onImportant={toggleImportant}
                onSubtask={toggleSubtask}
                onSelect={setSelectedTask}
              />
            ))
          )}
        </div>

        {lastDeleted && (
          <div className="undo-bar">
            Task deleted
            <button onClick={undoDelete}>Undo</button>
          </div>
        )}
      </div>
    );
  }

  function renderKanban() {
    const columns = ["Todo", "In Progress", "Completed"];

    return (
      <div className="page-content">
        <div className="page-header">
          <div>
            <p className="eyebrow">WORKFLOW</p>
            <h1>Kanban Board</h1>
            <p className="muted">
              Track your tasks through every stage of completion.
            </p>
          </div>

          <button className="primary-btn" onClick={openNewTask}>
            + New Task
          </button>
        </div>

        <div className="kanban-board">
          {columns.map((column) => {
            const columnTasks = tasks.filter(
              (task) => task.status === column
            );

            return (
              <div className="kanban-column" key={column}>
                <div className="kanban-header">
                  <h3>{column}</h3>
                  <span>{columnTasks.length}</span>
                </div>

                <div className="kanban-cards">
                  {columnTasks.map((task) => (
                    <div className="kanban-card" key={task.id}>
                      <div className="kanban-top">
                        <span
                          className={`priority ${task.priority.toLowerCase()}`}
                        >
                          {task.priority}
                        </span>

                        <button
                          className="icon-btn"
                          onClick={() => toggleImportant(task.id)}
                        >
                          {task.important ? "⭐" : "☆"}
                        </button>
                      </div>

                      <h3>{task.title}</h3>

                      <p>
                        {task.description || "No description provided."}
                      </p>

                      <div className="kanban-meta">
                        <span>📅 {formatDate(task.dueDate)}</span>
                        <span>⏱️ {task.estimated}m</span>
                      </div>

                      <select
                        value={task.status}
                        onChange={(e) =>
                          updateStatus(task.id, e.target.value)
                        }
                      >
                        <option>Todo</option>
                        <option>In Progress</option>
                        <option>Completed</option>
                      </select>
                    </div>
                  ))}

                  {columnTasks.length === 0 && (
                    <div className="kanban-empty">
                      No tasks here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderCalendar() {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const days = getDaysInMonth(year, month);
    const firstDay = getFirstDay(year, month);

    const monthName = calendarDate.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });

    const cells = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push(
        <div className="calendar-cell empty" key={`empty-${i}`} />
      );
    }

    for (let day = 1; day <= days; day++) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;

      const dayTasks = tasks.filter(
        (task) => task.dueDate === date
      );

      const isToday = date === today;

      cells.push(
        <div
          className={`calendar-cell ${isToday ? "today-cell" : ""}`}
          key={date}
        >
          <div className="calendar-day">{day}</div>

          <div className="calendar-tasks">
            {dayTasks.slice(0, 3).map((task) => (
              <button
                key={task.id}
                className={`calendar-task ${
                  task.completed ? "completed-calendar" : ""
                }`}
                onClick={() => setSelectedTask(task)}
              >
                {task.title}
              </button>
            ))}

            {dayTasks.length > 3 && (
              <small>+{dayTasks.length - 3} more</small>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="page-content">
        <div className="page-header">
          <div>
            <p className="eyebrow">PLANNING</p>
            <h1>Calendar</h1>
            <p className="muted">
              See all deadlines and planned tasks.
            </p>
          </div>

          <button className="primary-btn" onClick={openNewTask}>
            + New Task
          </button>
        </div>

        <div className="calendar-panel">
          <div className="calendar-controls">
            <button
              className="small-btn"
              onClick={() =>
                setCalendarDate(
                  new Date(year, month - 1, 1)
                )
              }
            >
              ←
            </button>

            <h2>{monthName}</h2>

            <button
              className="small-btn"
              onClick={() =>
                setCalendarDate(
                  new Date(year, month + 1, 1)
                )
              }
            >
              →
            </button>
          </div>

          <div className="calendar-weekdays">
            {[
              "Sun",
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat",
            ].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="calendar-grid">{cells}</div>
        </div>
      </div>
    );
  }

  function renderFocus() {
    const minutes = Math.floor(focusTime / 60);
    const seconds = focusTime % 60;

    return (
      <div className="page-content focus-page">
        <div className="page-header">
          <div>
            <p className="eyebrow">DEEP WORK</p>
            <h1>Focus Center</h1>
            <p className="muted">
              Work in focused sessions and build your productivity streak.
            </p>
          </div>
        </div>

        <div className="focus-layout">
          <div className="focus-card">
            <div className="timer-tabs">
              <button
                className={focusMode === "Focus" ? "active" : ""}
                onClick={() => resetTimer("Focus")}
              >
                Focus
              </button>

              <button
                className={focusMode === "Short Break" ? "active" : ""}
                onClick={() => resetTimer("Short Break")}
              >
                Short Break
              </button>

              <button
                className={focusMode === "Long Break" ? "active" : ""}
                onClick={() => resetTimer("Long Break")}
              >
                Long Break
              </button>
            </div>

            <div className="timer-circle">
              <span>{focusMode}</span>

              <strong>
                {String(minutes).padStart(2, "0")}:
                {String(seconds).padStart(2, "0")}
              </strong>
            </div>

            <div className="timer-actions">
              <button
                className="primary-btn"
                onClick={() => setTimerRunning((value) => !value)}
              >
                {timerRunning ? "Pause" : "Start Focus"}
              </button>

              <button
                className="small-btn"
                onClick={() => resetTimer(focusMode)}
              >
                Reset
              </button>
            </div>

            <p className="focus-tip">
              💡 Tip: Put your phone away and focus on one task at a time.
            </p>
          </div>

          <div className="focus-side">
            <div className="panel">
              <p className="eyebrow">TODAY</p>
              <h2>Focus Statistics</h2>

              <div className="focus-stat">
                <span>Sessions completed</span>
                <strong>{sessions}</strong>
              </div>

              <div className="focus-stat">
                <span>XP earned</span>
                <strong>{sessions * 25}</strong>
              </div>

              <div className="focus-stat">
                <span>Current streak</span>
                <strong>{streak} 🔥</strong>
              </div>
            </div>

            <div className="panel">
              <p className="eyebrow">FOCUS TASKS</p>
              <h2>Active Work</h2>

              {tasks
                .filter((task) => !task.completed)
                .slice(0, 4)
                .map((task) => (
                  <div className="focus-task" key={task.id}>
                    <span
                      className={`priority-dot ${task.priority.toLowerCase()}`}
                    />
                    <span>{task.title}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderAnalytics() {
    const high = tasks.filter((t) => t.priority === "High").length;
    const medium = tasks.filter((t) => t.priority === "Medium").length;
    const low = tasks.filter((t) => t.priority === "Low").length;

    return (
      <div className="page-content">
        <div className="page-header">
          <div>
            <p className="eyebrow">INSIGHTS</p>
            <h1>Analytics</h1>
            <p className="muted">
              Understand how you are managing your work.
            </p>
          </div>
        </div>

        <div className="stats-grid">
          <StatCard
            icon="📊"
            label="Completion Rate"
            value={`${progress}%`}
            color="blue"
          />

          <StatCard
            icon="🔥"
            label="Current Streak"
            value={`${streak} days`}
            color="orange"
          />

          <StatCard
            icon="⭐"
            label="XP"
            value={xp}
            color="green"
          />

          <StatCard
            icon="⏱️"
            label="Focus Sessions"
            value={sessions}
            color="purple"
          />
        </div>

        <div className="analytics-grid">
          <div className="panel">
            <p className="eyebrow">PRIORITY DISTRIBUTION</p>
            <h2>Task Priorities</h2>

            <AnalyticsBar
              label="High"
              value={high}
              total={Math.max(tasks.length, 1)}
            />

            <AnalyticsBar
              label="Medium"
              value={medium}
              total={Math.max(tasks.length, 1)}
            />

            <AnalyticsBar
              label="Low"
              value={low}
              total={Math.max(tasks.length, 1)}
            />
          </div>

          <div className="panel">
            <p className="eyebrow">WORKLOAD</p>
            <h2>Estimated Time</h2>

            <div className="big-number">
              {Math.round(
                tasks.reduce(
                  (sum, task) => sum + Number(task.estimated || 0),
                  0
                ) / 60
              )}
              <span> hours</span>
            </div>

            <p className="muted">
              Total estimated time across all tasks.
            </p>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">ACHIEVEMENTS</p>
              <h2>Your Achievements</h2>
            </div>
          </div>

          <div className="achievement-grid">
            {achievements.map((achievement) => (
              <div
                className={`achievement ${
                  achievement.unlocked ? "unlocked" : "locked"
                }`}
                key={achievement.title}
              >
                <span>{achievement.icon}</span>
                <div>
                  <strong>{achievement.title}</strong>
                  <p>{achievement.text}</p>
                </div>

                <small>
                  {achievement.unlocked ? "Unlocked" : "Locked"}
                </small>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <p className="eyebrow">CATEGORY ANALYSIS</p>
          <h2>Productivity by Category</h2>

          <div className="analytics-category-grid">
            {categoryStats.map((item) => (
              <div className="analytics-category" key={item.category}>
                <div>
                  <strong>{item.category}</strong>
                  <span>{item.percent}%</span>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderSettings() {
    return (
      <div className="page-content">
        <div className="page-header">
          <div>
            <p className="eyebrow">PREFERENCES</p>
            <h1>Settings</h1>
            <p className="muted">
              Customize TaskFlow and manage your data.
            </p>
          </div>
        </div>

        <div className="settings-grid">
          <div className="panel">
            <p className="eyebrow">APPEARANCE</p>
            <h2>Theme</h2>

            <div className="theme-buttons">
              <button
                className={theme === "dark" ? "selected" : ""}
                onClick={() => setTheme("dark")}
              >
                🌙 Dark
              </button>

              <button
                className={theme === "light" ? "selected" : ""}
                onClick={() => setTheme("light")}
              >
                ☀️ Light
              </button>
            </div>
          </div>

          <div className="panel">
            <p className="eyebrow">DATA</p>
            <h2>Backup & Restore</h2>

            <div className="settings-actions">
              <button className="small-btn" onClick={exportData}>
                ⬇ Export Data
              </button>

              <label className="small-btn file-label">
                ⬆ Import Data
                <input
                  type="file"
                  accept=".json"
                  onChange={importData}
                />
              </label>
            </div>
          </div>

          <div className="panel">
            <p className="eyebrow">SHORTCUTS</p>
            <h2>Keyboard Shortcuts</h2>

            <div className="shortcut">
              <span>Create new task</span>
              <kbd>N</kbd>
            </div>

            <div className="shortcut">
              <span>Search</span>
              <kbd>/</kbd>
            </div>

            <div className="shortcut">
              <span>Dashboard</span>
              <kbd>D</kbd>
            </div>
          </div>

          <div className="panel danger-panel">
            <p className="eyebrow">DANGER ZONE</p>
            <h2>Delete Data</h2>

            <p className="muted">
              These actions cannot be undone unless you have exported a backup.
            </p>

            <button className="danger-btn" onClick={clearAll}>
              Delete All Tasks
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderPage() {
    if (page === "dashboard") return renderDashboard();
    if (page === "tasks") return renderTasks();
    if (page === "kanban") return renderKanban();
    if (page === "calendar") return renderCalendar();
    if (page === "focus") return renderFocus();
    if (page === "analytics") return renderAnalytics();
    if (page === "settings") return renderSettings();

    return renderDashboard();
  }

  const navigation = [
    {
      section: "WORKSPACE",
      items: [
        ["dashboard", "⌂", "Dashboard"],
        ["tasks", "✓", "Tasks"],
        ["kanban", "▦", "Kanban"],
        ["calendar", "□", "Calendar"],
      ],
    },
    {
      section: "PRODUCTIVITY",
      items: [
        ["focus", "◉", "Focus"],
        ["analytics", "▥", "Analytics"],
      ],
    },
    {
      section: "SYSTEM",
      items: [["settings", "⚙", "Settings"]],
    },
  ];

  return (
    <div className={`app-shell ${theme}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">✓</div>

          <div>
            <strong>TaskFlow</strong>
            <span>PRO</span>
          </div>
        </div>

        <div className="profile-card">
          <div className="avatar">P</div>

          <div>
            <strong>Pranali</strong>
            <span>Level {level} • {xp} XP</span>
          </div>
        </div>

        <nav>
          {navigation.map((group) => (
            <div className="nav-group" key={group.section}>
              <p>{group.section}</p>

              {group.items.map(([id, icon, label]) => (
                <button
                  key={id}
                  className={page === id ? "active" : ""}
                  onClick={() => setPage(id)}
                >
                  <span>{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="level-card">
            <div className="level-head">
              <span>Level {level}</span>
              <strong>{levelProgress}/100 XP</strong>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${levelProgress}%` }}
              />
            </div>

            <small>Keep completing tasks to level up!</small>
          </div>

          <button
            className="theme-toggle"
            onClick={() =>
              setTheme(theme === "dark" ? "light" : "dark")
            }
          >
            {theme === "dark" ? "☀️ Light mode" : "🌙 Dark mode"}
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="mobile-brand">
            <strong>TaskFlow</strong>
          </div>

          <div className="top-search">
            <span>⌕</span>
            <input
              className="global-search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);

                if (page !== "tasks") {
                  setPage("tasks");
                }
              }}
              placeholder="Search anything..."
            />
            <kbd>/</kbd>
          </div>

          <div className="top-actions">
            <button
              className="top-icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Toggle theme"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            <button
              className="top-icon"
              onClick={() => showToast("No new notifications")}
              title="Notifications"
            >
              🔔
            </button>

            <div className="top-avatar">P</div>
          </div>
        </header>

        {renderPage()}
      </main>

      {showModal && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target.className === "modal-overlay") {
              setShowModal(false);
            }
          }}
        >
          <form className="modal" onSubmit={saveTask}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">
                  {editingTask ? "EDIT TASK" : "NEW TASK"}
                </p>
                <h2>
                  {editingTask ? "Update your task" : "Create a new task"}
                </h2>
              </div>

              <button
                type="button"
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <label>
              Task title *
              <input
                value={form.title}
                onChange={(e) =>
                  setForm({
                    ...form,
                    title: e.target.value,
                  })
                }
                placeholder="What needs to be done?"
                autoFocus
              />
            </label>

            <label>
              Description
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: e.target.value,
                  })
                }
                placeholder="Add more details..."
                rows="3"
              />
            </label>

            <div className="form-grid">
              <label>
                Priority
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      priority: e.target.value,
                    })
                  }
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </label>

              <label>
                Category
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      category: e.target.value,
                    })
                  }
                >
                  <option>Study</option>
                  <option>Projects</option>
                  <option>Placement</option>
                  <option>Personal</option>
                  <option>Health</option>
                  <option>Finance</option>
                  <option>Other</option>
                </select>
              </label>

              <label>
                Due date
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      dueDate: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Estimated minutes
                <input
                  type="number"
                  min="5"
                  value={form.estimated}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      estimated: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Status
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value,
                    })
                  }
                >
                  <option>Todo</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                </select>
              </label>

              <label>
                Tags
                <input
                  value={form.tags}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      tags: e.target.value,
                    })
                  }
                  placeholder="React, Java, Placement"
                />
              </label>
            </div>

            <label>
              Subtasks
              <textarea
                value={form.subtasks}
                onChange={(e) =>
                  setForm({
                    ...form,
                    subtasks: e.target.value,
                  })
                }
                placeholder={"One subtask per line\nBuild UI\nAdd API\nTest"}
                rows="4"
              />
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.important}
                onChange={(e) =>
                  setForm({
                    ...form,
                    important: e.target.checked,
                  })
                }
              />
              Mark as important ⭐
            </label>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>

              <button type="submit" className="primary-btn">
                {editingTask ? "Save Changes" : "Create Task"}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedTask && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target.className === "modal-overlay") {
              setSelectedTask(null);
            }
          }}
        >
          <div className="modal task-details">
            <div className="modal-header">
              <div>
                <p className="eyebrow">TASK DETAILS</p>
                <h2>{selectedTask.title}</h2>
              </div>

              <button
                className="close-btn"
                onClick={() => setSelectedTask(null)}
              >
                ×
              </button>
            </div>

            <p className="detail-description">
              {selectedTask.description || "No description provided."}
            </p>

            <div className="detail-grid">
              <div>
                <small>Priority</small>
                <strong>{selectedTask.priority}</strong>
              </div>

              <div>
                <small>Category</small>
                <strong>{selectedTask.category}</strong>
              </div>

              <div>
                <small>Deadline</small>
                <strong>{formatDate(selectedTask.dueDate)}</strong>
              </div>

              <div>
                <small>Estimated</small>
                <strong>{selectedTask.estimated} minutes</strong>
              </div>
            </div>

            {selectedTask.tags.length > 0 && (
              <div className="detail-section">
                <small>Tags</small>

                <div className="tag-list">
                  {selectedTask.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedTask.subtasks.length > 0 && (
              <div className="detail-section">
                <small>Subtasks</small>

                {selectedTask.subtasks.map((subtask) => (
                  <label className="subtask" key={subtask.id}>
                    <input
                      type="checkbox"
                      checked={subtask.done}
                      onChange={() =>
                        toggleSubtask(
                          selectedTask.id,
                          subtask.id
                        )
                      }
                    />

                    <span
                      className={
                        subtask.done ? "subtask-done" : ""
                      }
                    >
                      {subtask.title}
                    </span>
                  </label>
                ))}
              </div>
            )}

            <div className="modal-actions">
              <button
                className="secondary-btn"
                onClick={() => {
                  setSelectedTask(null);
                  openEditTask(selectedTask);
                }}
              >
                Edit Task
              </button>

              <button
                className="danger-btn"
                onClick={() => {
                  deleteTask(selectedTask.id);
                  setSelectedTask(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon">{icon}</div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <div className="empty-state">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onEdit,
  onDelete,
  onImportant,
}) {
  return (
    <div className="task-row">
      <button
        className={`check ${task.completed ? "checked" : ""}`}
        onClick={() => onToggle(task.id)}
      >
        {task.completed ? "✓" : ""}
      </button>

      <div className="task-row-info">
        <strong className={task.completed ? "task-completed" : ""}>
          {task.title}
        </strong>

        <span>
          {task.category} • {formatDate(task.dueDate)}
        </span>
      </div>

      <span
        className={`priority ${task.priority.toLowerCase()}`}
      >
        {task.priority}
      </span>

      <button
        className="icon-btn"
        onClick={() => onImportant(task.id)}
      >
        {task.important ? "⭐" : "☆"}
      </button>

      <button
        className="icon-btn"
        onClick={() => onEdit(task)}
      >
        ✏️
      </button>

      <button
        className="icon-btn"
        onClick={() => onDelete(task.id)}
      >
        🗑️
      </button>
    </div>
  );
}

function TaskCard({
  task,
  onToggle,
  onEdit,
  onDelete,
  onImportant,
  onSubtask,
  onSelect,
}) {
  const subtaskDone = task.subtasks.filter(
    (subtask) => subtask.done
  ).length;

  const subtaskPercent =
    task.subtasks.length === 0
      ? 0
      : Math.round(
          (subtaskDone / task.subtasks.length) * 100
        );

  return (
    <div className={`task-card ${task.completed ? "completed-card" : ""}`}>
      <div className="task-check-area">
        <button
          className={`check large-check ${
            task.completed ? "checked" : ""
          }`}
          onClick={() => onToggle(task.id)}
        >
          {task.completed ? "✓" : ""}
        </button>
      </div>

      <div className="task-main">
        <div className="task-card-head">
          <div>
            <div className="task-labels">
              <span
                className={`priority ${task.priority.toLowerCase()}`}
              >
                {task.priority}
              </span>

              <span className="category-badge">
                {task.category}
              </span>

              {task.important && (
                <span className="important-badge">⭐ Important</span>
              )}
            </div>

            <h3
              className={task.completed ? "task-completed" : ""}
              onClick={() => onSelect(task)}
            >
              {task.title}
            </h3>
          </div>

          <div className="task-actions">
            <button
              className="icon-btn"
              onClick={() => onImportant(task.id)}
            >
              {task.important ? "⭐" : "☆"}
            </button>

            <button
              className="icon-btn"
              onClick={() => onEdit(task)}
            >
              ✏️
            </button>

            <button
              className="icon-btn"
              onClick={() => onDelete(task.id)}
            >
              🗑️
            </button>
          </div>
        </div>

        <p className="task-description">
          {task.description || "No description provided."}
        </p>

        {task.tags.length > 0 && (
          <div className="tag-list">
            {task.tags.map((tag) => (
              <span className="tag" key={tag}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {task.subtasks.length > 0 && (
          <div className="subtask-progress">
            <div className="subtask-head">
              <span>Subtasks</span>
              <strong>
                {subtaskDone}/{task.subtasks.length}
              </strong>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${subtaskPercent}%` }}
              />
            </div>

            <div className="subtask-list">
              {task.subtasks.map((subtask) => (
                <label className="subtask" key={subtask.id}>
                  <input
                    type="checkbox"
                    checked={subtask.done}
                    onChange={() =>
                      onSubtask(task.id, subtask.id)
                    }
                  />

                  <span className={subtask.done ? "subtask-done" : ""}>
                    {subtask.title}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="task-footer">
          <span>📅 {formatDate(task.dueDate)}</span>
          <span>⏱️ {task.estimated} min</span>
          <span>•</span>
          <span>{task.status}</span>
        </div>
      </div>
    </div>
  );
}

function AnalyticsBar({ label, value, total }) {
  const percentage = Math.round((value / total) * 100);

  return (
    <div className="analytics-bar">
      <div>
        <span>{label}</span>
        <strong>
          {value} ({percentage}%)
        </strong>
      </div>

      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}