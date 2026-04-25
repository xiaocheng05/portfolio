import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');

const title = document.querySelector('.projects-title');
title.textContent = `${projects.length} Projects`;

renderProjects(projects, projectsContainer, 'h2');