import { fetchJSON, renderProjects, fetchGitHubData} from './global.js';

const projects = await fetchJSON('./lib/projects.json');
const latestProjects = projects.slice(0, 3);

const projectsContainer = document.querySelector('.projects');
renderProjects(latestProjects, projectsContainer, 'h2');

const githubData = await fetchGitHubData('xiaocheng05');

const profileStats = document.querySelector('#profile-stats');

if (profileStats) {
  profileStats.innerHTML = `
    <h3>My GitHub Stats</h3>
    <div class="stats-grid">
      <div class="stat"><div class="label">Public Repos</div><div class="value">${githubData.public_repos}</div></div>
      <div class="stat"><div class="label">Public Gists</div><div class="value">${githubData.public_gists}</div></div>
      <div class="stat"><div class="label">Followers</div><div class="value">${githubData.followers}</div></div>
      <div class="stat"><div class="label">Following</div><div class="value">${githubData.following}</div></div>
    </div>
  `;
}