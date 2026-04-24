# János Fenyvesi — Portfolio

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![No Build](https://img.shields.io/badge/build-none-brightgreen)
![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success)

My personal landing page. One place that introduces me and links to
every GitHub project I care about — pulled live from the GitHub API,
so the list stays current without me ever editing this repo.

Built with vanilla HTML, CSS and JavaScript. No framework, no build step.

## What's here

- Hero with name, role, short bio, and a live "available for work" badge
- About with avatar (fetched from GitHub), skills, and a few quick facts
- Projects grid — live from `api.github.com/users/Fejanos/repos`, with
  pinned favourites always on top, filterable by language/topic, sortable
  by stars / recent updates / name
- Stats — repo count, stars, forks, followers, language breakdown,
  and the 6 most recently pushed repos
- Contact — copy-to-clipboard email and a form that opens the visitor's
  mail client pre-filled (so messages actually reach my inbox)
- Dark / light theme toggle, sticky nav with scroll-spy, mobile layout

## Running locally

Just open `index.html` in a browser. For best results (so the GitHub
API calls aren't blocked by strict `file://` policies) use a local server:

```bash
# Python 3
python -m http.server 8000

# Node
npx serve .
```

Then visit http://localhost:8000.

## Editing

Everything I normally change lives at the top of `app.js` inside a
single `CONFIG` object — name, bio, pinned repos, skills, social
links, etc. The HTML and CSS rarely need to change.

| Key                 | What it controls                                     |
| ------------------- | ---------------------------------------------------- |
| `githubUsername`    | Which GitHub account to fetch repos from             |
| `name`, `title`     | Displayed in hero, browser tab title, footer         |
| `bio`               | Short paragraph under the hero name                  |
| `email`             | Copy button + contact form recipient                 |
| `pinnedRepos`       | Repo names that always sort to the top               |
| `typewriterPhrases` | Rotating taglines under the hero name                |
| `skills`            | Chips in the About section                           |
| `facts`             | Three small numeric stats under About                |
| `socialLinks`       | github / linkedin / twitter URLs                     |
| `accentColor`       | Primary accent — overrides `--accent` at runtime     |

## File structure

```
portfolio/
├── index.html    # Semantic HTML5 — every section
├── style.css    # All visual styles — CSS custom properties at :root
├── app.js       # CONFIG + GitHub API + rendering + theme + form
└── README.md    # This file
```

## GitHub API notes

The site talks to the public REST API:

```
GET https://api.github.com/users/Fejanos
GET https://api.github.com/users/Fejanos/repos?per_page=100&sort=updated
```

Rate limit without a token is 60 req/hour per IP. If it's exceeded,
the page falls back to a small set of sample project cards so it
still looks complete.

## Contact form

The form doesn't talk to a backend — it validates the fields, then
opens the visitor's default mail client via a `mailto:` link with
`From`, subject and message pre-filled. When the visitor hits "send"
in their mail app, the message lands in my inbox. No server needed.

If you'd rather have a real form-to-inbox service (Formspree,
Web3Forms, EmailJS), swap the submit handler in `initContact()` in
`app.js` for a `fetch()` to the service endpoint.

## License

MIT.
