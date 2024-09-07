export function pullRequestTemplate(repo: any, pullRequests: { items: any[]; }) {
  return `
    <h3 class="text-lg font-semibold">${repo}</h3>
    <ul>${pullRequests.items.map(pr => `
        <li class="mb-2 flex flex-col">
            <div id="pr-item" class="p-2 bg-gray-700 rounded-md hover:bg-gray-600 flex-grow flex items-center">
                <img src="${pr.user.avatar_url}" class="avatar" alt="${pr.user.login}" />
                <a href="${pr.html_url}" target="_blank" class="link flex-grow max-w-70">${pr.title}</a>
                ${reviewsTemplate(pr.reviews)}
            </div>
        </li>`).join("")}
    </ul>
  `;
}

function reviewsTemplate(reviews: any) {
  const reviewsWithLabel = () => reviews.map((review: any) => `
    <img src="${review.user.avatar_url}" class="avatar" alt="${review.user.login}" />
    <label class="review-state ${review.state === "APPROVED" ? "approved" : "not-approved"}">${review.state.toLowerCase()}</label>
  `).join("");
  const reviewsIconOnly = () => reviews.slice(0, 3).map((review: any) => `
    <img src="${review.user.avatar_url}" class="avatar" alt="${review.state.toLowerCase()}" title="${review.state.toLowerCase()}" />
  `).join("")

  return `
   <span class="reviews-container flex items-center">
     ${reviews.length < 3 ? reviewsWithLabel() : reviewsIconOnly()}
     ${reviews.length > 3 ? `<span class="more-approvers">+${reviews.length - 3}</span>` : ""}
   </span>
  `;
}

export function actionsTemplate(repo: any, actions: { workflow_runs: any[]; }) {
  return `
    <h3 class="text-lg font-semibold">${repo}</h3>
    <ul class="flex flex-wrap">${actions.workflow_runs.map((workflow: any) => `
        <li class="mb-2 flex-grow items-center">
            <div class="p-2 bg-gray-700 rounded-md hover:bg-gray-600 flex-grow">
                <a href="${workflow.html_url}" target="_blank" class="link">${workflow.name}</a>
                ${workflowTemplate(workflow)} 
            </div>
        </li>`).join("")}
    </ul>
  `;
}

function workflowTemplate(workflow: any) {
  return `
    <ul id="${workflow.id}" class="flex flex-wrap -m-1">
        ${workflow.jobs.map((job: any) => jobTemplate(job)).join("")}
    </ul>
  `;
}

function jobTemplate(job: { status: string; conclusion: string; name: any; }) {
  const jobColor = () => {
    if (job.status === "completed" && job.conclusion === "success") {
      return "bg-green-200 border-green-600";
    } else if (job.conclusion === "failure") {
      return "bg-red-200 border-red-600";
    } else if (job.status === "waiting") {
      return "bg-yellow-200 border-yellow-600";
    } else if (job.status === "in_progress") {
      return "bg-blue-200 border-blue-600";
    } else {
      return "bg-gray-300 border-gray-300";
    }
  }
  return `
    <li class="p-1">
        <span class="${jobColor()} border rounded-lg p-3 shadow-sm flex justify-between items-center text-gray-600">
            <label class="text-sm">${job.name}</label>
        </span>
    </li>
  `;
}