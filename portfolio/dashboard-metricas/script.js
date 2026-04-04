const summaryData = {
  totalAppointments: 184,
  attendedPatients: 146,
  monthlyRevenue: 84250,
  cancelRate: 6.4,
};

const lastSevenDaysAppointments = {
  labels: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"],
  data: [22, 28, 19, 31, 34, 26, 24],
};

const monthlyRevenueData = {
  labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
  data: [42000, 47000, 53000, 49000, 56000, 61000, 58500, 64000, 70000, 76000, 81000, 84250],
};

const upcomingAppointments = [
  { patient: "Mariana Lopes", time: "08:30", service: "Consulta Clinica", status: "Confirmado" },
  { patient: "Joao Ribeiro", time: "09:15", service: "Retorno Cardiologia", status: "Pendente" },
  { patient: "Lucia Martins", time: "10:00", service: "Exame Preventivo", status: "Confirmado" },
  { patient: "Pedro Araujo", time: "10:45", service: "Avaliacao Nutricional", status: "Cancelado" },
  { patient: "Bianca Souza", time: "11:30", service: "Consulta Dermatologica", status: "Confirmado" },
  { patient: "Roberto Silva", time: "14:15", service: "Ultrassonografia", status: "Pendente" },
];

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function fillSummaryCards() {
  document.getElementById("totalAppointments").textContent = String(summaryData.totalAppointments);
  document.getElementById("attendedPatients").textContent = String(summaryData.attendedPatients);
  document.getElementById("monthlyRevenue").textContent = currencyFormatter.format(summaryData.monthlyRevenue);
  document.getElementById("cancelRate").textContent = `${summaryData.cancelRate.toFixed(1)}%`;
}

function renderAppointmentsTable() {
  const tbody = document.getElementById("appointmentsTableBody");
  tbody.innerHTML = "";

  upcomingAppointments.forEach((appointment) => {
    const tr = document.createElement("tr");
    const statusClass = appointment.status.toLowerCase();

    tr.innerHTML = `
      <td>${appointment.patient}</td>
      <td>${appointment.time}</td>
      <td>${appointment.service}</td>
      <td><span class="status ${statusClass}">${appointment.status}</span></td>
    `;

    tbody.appendChild(tr);
  });
}

function chartBaseOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#e6edf8",
          font: { family: "Manrope" },
        },
      },
      tooltip: {
        backgroundColor: "rgba(12, 18, 28, 0.95)",
        borderColor: "rgba(49, 166, 255, 0.38)",
        borderWidth: 1,
        titleColor: "#f4fbff",
        bodyColor: "#d6e6ff",
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#9fb2d2",
          font: { family: "Manrope" },
        },
        grid: {
          color: "rgba(63, 80, 107, 0.25)",
          drawBorder: false,
        },
      },
      y: {
        ticks: {
          color: "#9fb2d2",
          font: { family: "Manrope" },
        },
        grid: {
          color: "rgba(63, 80, 107, 0.25)",
          drawBorder: false,
        },
      },
    },
  };
}

function createAppointmentsChart() {
  const ctx = document.getElementById("appointmentsChart");
  const options = chartBaseOptions();

  options.plugins.legend.display = false;

  new Chart(ctx, {
    type: "line",
    data: {
      labels: lastSevenDaysAppointments.labels,
      datasets: [
        {
          label: "Agendamentos",
          data: lastSevenDaysAppointments.data,
          borderColor: "#31a6ff",
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#31a6ff",
          pointBorderColor: "#e8f5ff",
          backgroundColor: "rgba(49, 166, 255, 0.16)",
          fill: true,
          tension: 0.35,
        },
      ],
    },
    options,
  });
}

function createRevenueChart() {
  const ctx = document.getElementById("revenueChart");
  const options = chartBaseOptions();

  options.plugins.legend.display = false;
  options.scales.y.ticks.callback = (value) => `R$ ${Number(value / 1000).toFixed(0)}k`;

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: monthlyRevenueData.labels,
      datasets: [
        {
          label: "Receita",
          data: monthlyRevenueData.data,
          borderRadius: 8,
          backgroundColor: monthlyRevenueData.data.map((value, index, arr) => {
            const max = Math.max(...arr);
            return value === max ? "#19c2a6" : "rgba(49, 166, 255, 0.74)";
          }),
          hoverBackgroundColor: "#19c2a6",
        },
      ],
    },
    options,
  });
}

fillSummaryCards();
renderAppointmentsTable();
createAppointmentsChart();
createRevenueChart();
