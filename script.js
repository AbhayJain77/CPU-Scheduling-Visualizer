let processes = [];
let animationInterval = null;
let currentStep = 0;
let animationSpeed = 100;
let isPlaying = false;
let schedulingResult = null;
let isSaved = false;

document.getElementById("processForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const pid = document.getElementById("pid").value;
  const arrival = parseInt(document.getElementById("arrival").value);
  const burst = parseInt(document.getElementById("burst").value);
  const priority = document.getElementById("priority").value || null;

  if (processes.some(p => p.pid === pid)) {
    alert("Process ID must be unique");
    return;
  }

  const process = { 
    pid, 
    arrival, 
    burst, 
    remaining: burst, 
    priority: priority ? parseInt(priority) : null 
  };
  
  processes.push(process);
  updateProcessTable();
  this.reset();
  isSaved = false;
});

document.getElementById("algorithm").addEventListener("change", function () {
  const quantumInput = document.getElementById("quantum");
  if (this.value === "rr") {
    quantumInput.style.display = "inline";
  } else {
    quantumInput.style.display = "none";
  }
  isSaved = false;
});

document.getElementById("saveBtn").addEventListener("click", saveConfiguration);
document.getElementById("resetBtn").addEventListener("click", resetAll);
document.getElementById("playPauseBtn").addEventListener("click", togglePlayPause);
document.getElementById("stepBtn").addEventListener("click", stepForward);
document.getElementById("speedSlider").addEventListener("input", function(){
  const sliderValue = parseInt(this.value);
//   console.log("Slider Value:", sliderValue);
  animationSpeed = 1100 - (sliderValue * 100);
  if (isPlaying) {
    clearInterval(animationInterval);
    startAnimation();
  }
});


function saveConfiguration() {
  if (processes.length === 0) {
    alert("Please add at least one process");
    return;
  }

  const algorithm = document.getElementById("algorithm").value;
  if (algorithm === "rr" && !document.getElementById("quantum").value) {
    alert("Please enter time quantum for Round Robin");
    return;
  }

  resetOutput();
  currentStep = 0;
  schedulingResult = null;
  
  switch (algorithm) {
    case "fcfs": schedulingResult = fcfs(); break;
    case "sjf": schedulingResult = sjf(); break;
    case "rr": 
      const quantum = parseInt(document.getElementById("quantum").value);
      schedulingResult = roundRobin(quantum); 
      break;
    case "priority": schedulingResult = prioritySched(); break;
    default: alert("Invalid algorithm selected");
  }

  // Handle single process case
  if (processes.length === 1) {
    const p = processes[0];
    p.waitTime = 0;
    p.tat = p.burst;
    schedulingResult.totalWait = 0;
    schedulingResult.totalTat = p.burst;
    schedulingResult.gantt = [{ pid: p.pid, duration: p.burst }];
  }

  document.getElementById("playPauseBtn").disabled = false;
  document.getElementById("stepBtn").disabled = false;
  isSaved = true;
//   updateVisualization();
}

function updateProcessTable() {
  const tableBody = document.querySelector("#processTable tbody");
  tableBody.innerHTML = "";
  
  processes.forEach((process, index) => {
    const row = document.createElement("tr");
    
    row.innerHTML = `
      <td>${process.pid}</td>
      <td>${process.arrival}</td>
      <td>${process.burst}</td>
      <td>${process.priority || '-'}</td>
      <td><button class="delete-btn" data-index="${index}">Delete</button></td>
    `;
    
    tableBody.appendChild(row);
  });
  
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", function() {
      const index = parseInt(this.getAttribute("data-index"));
      processes.splice(index, 1);
      updateProcessTable();
      isSaved = false;
    });
  });
}

function resetAll() {
  clearInterval(animationInterval);
  isPlaying = false;
  isSaved = false;
  document.getElementById("playPauseBtn").textContent = "Play";
  document.getElementById("playPauseBtn").disabled = true;
  document.getElementById("stepBtn").disabled = true;
  
  processes.forEach(p => {
    p.remaining = p.burst;
    delete p.done;
    delete p.waitTime;
    delete p.tat;
  });
  
  resetOutput();
  currentStep = 0;
  schedulingResult = null;
}

function resetOutput() {
  document.getElementById("ganttChart").innerHTML = "";
  document.getElementById("results").innerHTML = "";
  document.getElementById("detailedResults").innerHTML = "";
  document.getElementById("currentTime").textContent = "Time: 0";
}

function togglePlayPause() {
  if (!isSaved) {
    alert("Please save configuration first");
    return;
  }

  if (isPlaying) {
    clearInterval(animationInterval);
    document.getElementById("playPauseBtn").textContent = "Play";
  } else {
    startAnimation();
    document.getElementById("playPauseBtn").textContent = "Pause";
  }
  isPlaying = !isPlaying;
}

function startAnimation() {
  // If already at the end, reset to start
  if (currentStep >= schedulingResult.gantt.length - 1) {
    currentStep = 0;
  }
  
  updateVisualization();
  animationInterval = setInterval(() => {
    if (currentStep >= schedulingResult.gantt.length - 1) {
      clearInterval(animationInterval);
      isPlaying = false;
      document.getElementById("playPauseBtn").textContent = "Play";
      document.getElementById("playPauseBtn").disabled = false;
      document.getElementById("stepBtn").disabled = false;
      updateVisualization(true); // Mark as completed
      return;
    }
    stepForward();
  }, animationSpeed);
}

function stepForward() {
  if (!isSaved) {
    alert("Please save configuration first");
    return;
  }

  if (!schedulingResult || currentStep >= schedulingResult.gantt.length - 1) {
    document.getElementById("playPauseBtn").disabled = true;
    document.getElementById("stepBtn").disabled = true;
    updateVisualization(true); // Mark as completed
    return;
  }
  
  currentStep++;
  updateVisualization(currentStep >= schedulingResult.gantt.length - 1);
}

function updateVisualization(isCompleted = false) {

  const chart = document.getElementById("ganttChart");
  chart.innerHTML = "";
  
  let currentTime = 0;
  
  for (let i = 0; i <= currentStep; i++) {
    const block = schedulingResult.gantt[i];
    const div = document.createElement("div");
    const isActive = !isCompleted && i === currentStep;
    div.className = `gantt-block ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`;
    div.textContent = block.pid;
    div.style.width = `${block.duration * 20}px`;
    div.setAttribute('data-time', currentTime);
    chart.appendChild(div);
    currentTime += block.duration;
  }
  
  document.getElementById("currentTime").textContent = `Time: ${currentTime}`;
  
  if (currentStep === schedulingResult.gantt.length - 1) {
    displayFinalResults();
  }
}

function displayFinalResults() {
  const n = processes.length;
  const avgWait = schedulingResult.totalWait / n;
  const avgTat = schedulingResult.totalTat / n;
  
  document.getElementById("results").innerHTML = `
    <div class="avg-results">
      <div>Average Waiting Time: ${avgWait.toFixed(2)}</div>
      <div>Average Turnaround Time: ${avgTat.toFixed(2)}</div>
    </div>
  `;
  
  let detailedHTML = '<div class="process-info"><h3>Process Details</h3>';
  processes.forEach(p => {
    detailedHTML += `
      <div class="process-card">
        <p><strong>${p.pid}</strong></p>
        <p>Arrival: ${p.arrival}</p>
        <p>Burst: ${p.burst}</p>
        <p>Wait: ${p.waitTime}</p>
        <p>TAT: ${p.tat}</p>
      </div>
    `;
  });
  detailedHTML += '</div>';
  
  document.getElementById("detailedResults").innerHTML = detailedHTML;
}

// Scheduling algorithms
function fcfs() {
  processes.sort((a, b) => a.arrival - b.arrival);
  let time = 0, totalWait = 0, totalTat = 0, gantt = [];

  processes.forEach(p => {
    const start = Math.max(time, p.arrival);
    const wait = start - p.arrival;
    const tat = wait + p.burst;

    if (start > time) {
      gantt.push({ pid: "Idle", duration: start - time });
    }

    p.waitTime = wait;
    p.tat = tat;

    totalWait += wait;
    totalTat += tat;
    gantt.push({ pid: p.pid, duration: p.burst });
    time = start + p.burst;
  });

  return { gantt, totalWait, totalTat };
}

function sjf() {
  let time = 0, completed = 0, totalWait = 0, totalTat = 0, gantt = [];
  const n = processes.length;
  let ready = [];

  processes.sort((a, b) => a.arrival - b.arrival);

  while (completed < n) {
    ready = processes.filter(p => p.arrival <= time && !p.done);
    if (ready.length === 0) {
      gantt.push({ pid: "Idle", duration: 1 });
      time++;
      continue;
    }

    ready.sort((a, b) => a.burst - b.burst);
    const curr = ready[0];
    curr.done = true;

    const wait = time - curr.arrival;
    const tat = wait + curr.burst;

    curr.waitTime = wait;
    curr.tat = tat;

    totalWait += wait;
    totalTat += tat;
    gantt.push({ pid: curr.pid, duration: curr.burst });
    time += curr.burst;
    completed++;
  }

  processes.forEach(p => delete p.done);
  return { gantt, totalWait, totalTat };
}

function roundRobin(quantum) {
  let time = 0, queue = [], completed = 0, totalWait = 0, totalTat = 0, gantt = [];
  const n = processes.length;
  processes.sort((a, b) => a.arrival - b.arrival);

  queue.push(...processes.filter(p => p.arrival === 0));

  while (completed < n) {
    const current = queue.shift();
    if (!current) {
      gantt.push({ pid: "Idle", duration: 1 });
      time++;
      queue.push(...processes.filter(p => p.arrival <= time && !p.done && !queue.includes(p)));
      continue;
    }

    const execTime = Math.min(quantum, current.remaining);
    current.remaining -= execTime;
    gantt.push({ pid: current.pid, duration: execTime });
    time += execTime;

    if (current.remaining === 0) {
      current.done = true;
      completed++;
      const tat = time - current.arrival;
      const wait = tat - current.burst;

      current.waitTime = wait;
      current.tat = tat;

      totalTat += tat;
      totalWait += wait;
    } else {
      queue.push(current);
    }

    queue.push(...processes.filter(p => p.arrival <= time && !p.done && !queue.includes(p) && p !== current));
  }

  processes.forEach(p => { p.remaining = p.burst; delete p.done; });
  return { gantt, totalWait, totalTat };
}

function prioritySched() {
  let time = 0, completed = 0, totalWait = 0, totalTat = 0, gantt = [];
  const n = processes.length;

  while (completed < n) {
    const ready = processes.filter(p => p.arrival <= time && !p.done);
    if (ready.length === 0) {
      gantt.push({ pid: "Idle", duration: 1 });
      time++;
      continue;
    }

    ready.sort((a, b) => a.priority - b.priority);
    const curr = ready[0];
    curr.done = true;

    const wait = time - curr.arrival;
    const tat = wait + curr.burst;

    curr.waitTime = wait;
    curr.tat = tat;

    totalWait += wait;
    totalTat += tat;
    gantt.push({ pid: curr.pid, duration: curr.burst });
    time += curr.burst;
    completed++;
  }

  processes.forEach(p => delete p.done);
  return { gantt, totalWait, totalTat };
}
