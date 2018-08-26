# How to build a fully automated kanban power-up for your GitHub Project board using a custom webhook

> This post was originally published on [The Andela Way](https://medium.com/the-andela-way/how-to-build-a-power-up-for-your-github-project-board-for-project-management-344d5b380a68).

> TLDR; You can tune-up your GitHub Project board with a custom web-hook integration to meet your software development project management needs. You can checkout the code github, remix it on glitch, or deploy a working instance for repository with zeit/now.

![Screenshot of fully configured project board using kanbanize][screenshot-of-github-project-board]
*Screenshot of a project board used by the creative team at Andela using a custom webhook integration I built for the team.*

Managing the software development process can be a bit of a [PITA](https://www.urbandictionary.com/define.php?term=P.I.T.A). This is often not due to the actual coding aspect of it but more often than not, it is due to the tools fatigue you get from incorporating different tools to manage the whole process. And of course, [there are a million and one tools](https://www.google.com/search?q=software+project+management+tools&oq=software+project+management+tools&aqs=chrome..69i57j0l7.6776j0j1&sourceid=chrome&ie=UTF-8) out there to “help your team focus on the work and not the process”, but in truth, no one tool out there usually fits the bill, at least not entirely–and this is understandable, after all no two teams are alike or work in the exact same way.

In this post you’ll build a fairly simple and extensible kanban power-up for GitHub Projects that automates the triaging of new issues to project boards and to track issue statuses automatically.

The problem you’re solving for here is pretty straightforward. GitHub already has support for managing your projects on a kanban-like board. And GitHub Projects allows for some automation, for example you can set up the native project column automation to add a new card when an issue is opened or closed and move issues along the project column when a pull request is submitted.

![Screenshot of an overview of Github Projects features.](https://cdn-images-1.medium.com/max/5744/1*aHOnIOMIV51jDuFaLidqLg.png)
*Screenshot of an overview of [Github Projects](https://help.github.com/articles/about-project-boards/) features.*

As useful as these automations are, there’s still room for improvement. For example, with the current setup, you’re unable to automate the movement of issues along your project columns (or pipelines) to track the status of a feature/issue on a project board. Also, you’re unable to triage issues between multiple projects in a repository.
cr
![](https://cdn-images-1.medium.com/max/2000/1*7RE3mbYL77ndaHqkMsn0OA.png =33%x*)![](https://cdn-images-1.medium.com/max/2000/1*otWpUhSLWnjTQ26ztEPqYw.png =33%x*)![Built-in automations for Github Projects](https://cdn-images-1.medium.com/max/2000/1*ImOFDMqiSbroqpHFSSrykg.png =33%x*)
*Built-in automations for Github Projects*

With this power-up, you’ll solve the following:

1. Moving a project card along the board automatically.

1. Triaging issues to different project boards automatically.

You’ll make use of the GitHub labels feature to solve these, with the webhook events ‘labeled’ and ‘unlabeled’ as the triggering mechanism.

The final solution will look this:

![Video of repo using kanbanize][kanbanize-video]

GitHub has a few things that make it super simple to customize:

* A powerful API. You’ll be using the new, all-powerful [GraphQL API v4](https://developer.github.com/v4/) and a touch of the old [GitHub REST API v3](https://developer.github.com/v3/).

* A [web-hook](https://developer.github.com/webhooks/) that allows you to subscribe to events in your github repository, in our case you’ll subscribe to the ‘labeled’ and ‘unlabeled’ events on an issue.

* A [labeling feature](https://help.github.com/articles/creating-a-label/) for issues with a name, description, and color.

## Configuring your GitHub repository

Let’s start with the most challenging bit in my opinion, creating the right taxonomy for our issue labels. Remember we’re looking to solve for two things, to move an issue along the project board based on it’s status and to triage issues to a project board. You’ll employ the not-so-often used **description** property of a label to help us identify an issue’s status as well as the project it belongs to.

Before I built this solution which is part of a project management solution our creative team at [Andela](https://andela.com) uses, I reached out to GitHub support to figure out the best way to accomplish this.

![Email correspondences with Github Support](https://cdn-images-1.medium.com/max/4888/1*WZaWp_zqxu7Bb9fpIniFpA.png)*Email correspondences with Github Support*

I ended up employing the two recommendations from Ivan, the GitHub support representative. With the right labels, you can subscribe to the ‘labeled’ and ‘unlabeled’ events and use the payload delivered to your web-hook to add an issue to a project board and to move that issue (now a project card) along our project columns.

GitHub labels have three properties that you can configure, a name, a description, and a color. You’ll use the name and description properties to set up our new labeling system. Feel free to go berserk with your label coloring scheme!

### Tracking issue progress using status labels

![Tracking issue status with Github labels](https://cdn-images-1.medium.com/max/3924/1*vuCSEWhhQYp7j3D9R_fyQQ.png)*
Tracking issue status with [Github labels](https://help.github.com/articles/creating-a-label/).*

Create a status label by giving it a name that represents a stage in issue management process and description of ‘status'.

![A Github **status** label](https://cdn-images-1.medium.com/max/3928/1*bAc2DST65dOzFYDOuzJT6A.png)
*A Github **status** label.*

The status labels you create will mirror the columns in your project board. As in the screenshot above, you’ll have the following statuses/project columns:

* **incoming** — all new tickets.

* **scheduled** — all tickets that have been reviewed.

* **in progress** — all tickets that are being worked on.

* **in review** — all tickets that have been worked on and are awaiting approval.

* **completed** — all tickets that have been worked on and have been reviewed and accepted.

* **canceled** — all tickets that were canceled for any possible reasons.

* **blocked** — all tickets that are being blocked for one reason or another.

While these might seem like a lot, I think it more closely mirrors what actually happens in most teams. There can be only one issue label with the description of status. When you implement this, there will be only one label with the description ‘status’ on an issue.

### Triaging issues to project boards using labels

![A list of Github Projects for kanbanize][kanbanize-project-boards]
A list of Github Projects for [kanbanize](https://github.com/pauldariye/kanbanize).*

To triage issues to different projects, you’ll use a similar technique like you did to track issue statuses. You guessed it, labels to the rescue again! However, naming things can be hard so let’s employ [semvar](https://semver.org/)–naming convention for our projects. For example, imagine you’re managing a huge open source library, you may want to employ the major version releases as project names like so **v1.0.0**, **v2.0.0**, and so on. Again this is just my preference. You can name your projects anything you want, the only requirement is to add ‘project’ as the description. When you implement this, there will be only one label with the description ‘project’ on an issue.

![Example of a Github **project** label using semantic versioning convension for project names.](https://cdn-images-1.medium.com/max/3924/1*4EWzWQ5i_e5uPiDcvBgWcQ.png)*Example of a Github **project** label. This example uses [semvar](https://semver.org/) versioning for project names.*

Of course your project names can be completely different just ensure that

1. Your project name match labels with the label description ‘project’.

1. Your project columns match labels with the label description ‘status’.

### Configuring a GitHub web-hook

![Configuring a web-hook.](https://cdn-images-1.medium.com/max/2376/1*vJs4ppUUjK0o21rufHyAbQ.png)*Configuring a web-hook.*

To add a new web-hook to your GitHub repository, find the settings tab in the upper right hand corner in your github home.

From the screenshot:

1. Enter a url that the payload will be delivered to your web-hook. For local development, you can use [ngrok](http://ngrok.io) or [localtunnel](https://localtunnel.github.io/www/).

1. Select ‘application/json’ as the content type for the payload sent to your web-hook through the url you entered in 1 above.

1. Enter a simple secret that you’ll use to sign the request you get from github to validate it.

1. Pick individual events to tailor what events you subscribe to.

1. Subscribe to event issues.

1. Hit save.

That’s it!

Simple as that, you now have a fully configured GitHub web-hook. The last thing you need to do before diving into the code is to create a GitHub token. This will allow you to authenticate your requests to GitHub’s API. To get a personal token, [go to your GitHub settings](https://github.com/settings/tokens), create a new token giving it a memorable name, and **copy the token to a secure place**.

You’re now done with Github, time for some code!

## 1-minute introduction to GraphQL

To work with your Github issues and projects, you’ll use the new[ GitHub GraphQL API v4](https://developer.github.com/v4). Before diving into the code though, I thought it may be useful to give you a brief intro to GraphQL. I won’t do justice to GraphQL here so you can [click this link to learn more about GraphQL](https://graphql.org/).

GraphQL is a query language for your API built by the amazing folks at Facebook. The specifications for this query language are such that it allows you to essentially tell the server exactly want you want from it.

Here’s a somewhat contrived example of how you construct a request to a GraphQL service:

    { 
      profile {
       id
       name
       email
       likes
      }
    }

The response from the server will looks like this:

    {
      "data": {
        "profile": {
           "id": "someuniquealphanumerickey",
           "name": "Jane Doe",
           "email": "jane@doe.com",
           "likes": 200
         }
      }
    }

Notice how the JSON returned from the server matches the query you constructed!

If you come from the world of REST APIs, you know that in order to consume an API, you need to send GET, POST, PUT, PATCH, and DELETE requests to different endpoints on the server. Now imagine that instead of consuming the different endpoints that may exist for any of these actions, you can access all that data through one endpoint, picking and selecting the fields you need, and traversing through the data using a simple, intuitive, and self-documenting interface.

Verbatim from the [documentation](http://graphql.github.io/learn/schema/), “every GraphQL service defines a set of types that completely describe the set of possible data you can query on the service”. This means that there’s always a schema that defines how communication is carried out between the server and the client. And in this schema are types that you define for every GraphQL service, two of these are special types– query and mutation–out of several that may exist in the schema. These two special types define the entry point of every request to the GraphQL service. And of these two types, the query is most often used to make requests to the service and it is free of side-effects, whereas the mutation modifies objects on the service.

So, in our case, instead of using the [Github REST API v3](https://developer.github.com/v3/#root-endpoint) (although, you’ll use this to edit the issue labels), that has a root endpoint–[https://api.github.com](https://api.github.com)–and a gazillion category endpoints (seriously, I counted over 489 endpoints and [you can count them yourself here](https://developer.github.com/v3/apps/available-endpoints/)), we can leverage one endpoint to meet all our needs–[https://api.github.com/graphql](https://api.github.com/graphql).

You’ll see examples of GraphQL queries and its advantages below as we figure out the right requests for our power-up.

## **Consuming the GitHub GraphQL API v4**

Now, let’s dig into [GitHub’s GraphQL API v4 documentation](https://developer.github.com/v4/) to figure out what it permits us to do. We need to be able to query the issue and projects fields from the repository object. Also, we need to be able to mutate (or update) a project card and project board. Head over to the [GitHub GraphQL API Explorer](https://developer.github.com/v4/explorer/?variables=%7B%7D&query=query%20%7B%0A%20%20__type%28name%3A%20%22Repository%22%29%20%7B%0A%20%20%20%20name%0A%20%20%20%20kind%0A%20%20%20%20description%0A%20%20%20%20fields%20%7B%0A%20%20%20%20%20%20name%0A%20%20%20%20%7D%0A%20%20%7D%0A%7D) to see all the fields on the repository object.

    query {
      __type(name: "Repository") {
        name
        kind
        description
        fields {
          name
        }
      }
    }

Once on the [API Explorer](https://developer.github.com/v4/explorer/?variables=%7B%7D&query=query%20%7B%0A%20%20__type%28name%3A%20%22Repository%22%29%20%7B%0A%20%20%20%20name%0A%20%20%20%20kind%0A%20%20%20%20description%0A%20%20%20%20fields%20%7B%0A%20%20%20%20%20%20name%0A%20%20%20%20%7D%0A%20%20%7D%0A%7D), enter query above and you should see a response that looks like the one below (I’ve truncated the output to save space).

    {
      "data": {
        "__type": {
          "name": "Repository",
          "kind": "OBJECT",
          "description": "A repository contains the content for a project.",
          "fields": [
            ...

            {
              "name": "issue"
            },

            ...

            {
              "name": "projects"
            },

            ...

          ]
        }
      }
    }

From this, you see that we’re able to query on the issue and projects fields of any repository. When working with a GraphQL service, you’re mostly querying or mutating fields of an object, in this case a GitHub repository object. All in all we need to construct the queries on the issue and projects fields to do the following:

* Find an issue by number.

* Find a project by name.

* Find all project columns.

* Add an issue to a project column.

* Move a project card to a different column.

* Delete a card from a project.

With these, we’ve got everything we need to write the necessary queries and mutations for the web-hook.

### GraphQL operations

Here we’ll go through each of the query and mutation operations listed in the previous section so that you understand what’s going on.

To test these out as we go along, you can use the [GitHub GraphQL API Explorer](https://developer.github.com/v4/explorer/?variables=%7B%7D&query=query%20%7B%0A%20%20__type%28name%3A%20%22Repository%22%29%20%7B%0A%20%20%20%20name%0A%20%20%20%20kind%0A%20%20%20%20description%0A%20%20%20%20fields%20%7B%0A%20%20%20%20%20%20name%0A%20%20%20%20%7D%0A%20%20%7D%0A%7D) with the following object containing the required query variables.

    {
      "owner": "ENTER_GITHUB_USERNAME",
      "name": "ENTER_GITHUB_REPO_NAME",
      "number": "ENTER_GITHUB_ISSUE_NUMBER",
      "projectName": "ENTER_GITHUB_REPO_PROJECT_NAME"
      "issue": {
        "contentId": "ENTER_CONTENT_ID",
        "projectColumnId": "ENTER_PROJECT_COLUMN_ID"
      },
      "card": {
        "cardId": "ENTER_PROJECT_CARD_ID",
        "columnId": "ENTER_PROJECT_COLUMN_ID"
      }
    }

**Note**: The explorer makes use of real production data so you may want to try running these queries using a test repo.

### FindIssue

Find an issue by number.

```javascript
module.exports = `
  query FindIssue($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      issue(number: $number) {
        id
        number
        title
        projectCards(first: 100) {
          edges {
            node {
              id
              project {
                id
                name
              }
              column {
                id
                name
              }
            }
          }
        }
        labels(first: 100) {
          edges {
            node {
              id
              name
              description
            }
          }
        }
      }
    }
  }
`
```

With this query, you’re looking up an issue by its number, and picking the following fields id, title, projectCards, labels etc. You’re also telling the server to return the first hundred project cards and the first one-hundred labels associated with the issue.

### FindProject

Find a project by name.

```javascript
module.exports = `
  query FindProject($owner: String!, $name: String!, $projectName: String!) {
    repository(owner: $owner, name: $name) {
      projects(first: 1, search: $projectName) {
        edges {
          node {
            columns(first: 1) {
              edges {
                node {
                  id
                  name
                  cards(first: 20) {
                    edges {
                      node {
                        id
                        content
                        column {
                          id
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`
```

With this query, you’re looking up project columns by projectName and picking the first project matching it on the repository object, and picking the first column of that project board and the first twenty cards of that column.

### FindProjectColumns

Find all project columns.

```javascript
module.exports = `
  query FindProjectColumns($owner: String!, $name: String!, $projectName: String!) {
    repository(owner: $owner, name: $name) {
      projects(first: 2, search: $projectName){
        edges {
          node {
            id
            name
            columns(first: 20) {
              edges {
                node {
                  id
                  name
                  cards(first: 100) {
                    edges {
                      node {
                        id
                        content
                        column {
                          id
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`
```

This query looks up a project by projectName (aka label) and selects the first two projects on the repository object along with first twenty columns of that project board and the first one-hundred cards of each column. It is an example of a complex and expensive query. And as you would expect with any api service, Github provides [a guideline on how to moderate api requests](https://developer.github.com/v4/guides/resource-limitations/). This single call replaces probably 10 or more REST requests. And that’s another advantage of GraphQL, a single complex call replaces possible thousands of REST requests!

The server cost for this query is:

1 (one repository) + 1*2 (first two project cards) + 1*2*20 (first twenty columns for each project card) + 1*2*20*100 (first one hundred cards of a project column) = 4, 043 total nodes.

To get the score, you divide this by 100, meaning that the score is **40.43**!

GitHub’s GraphQL service has a limit of **5000 points per hour **and you’ve used up only **0.8% **for this query.** **What power at your disposal!

### AddProjectCard

Add an issue to a project column. This produces a side-effect since we updating the project object to include a new card.

```javascript
module.exports = `
  mutation AddProjectCard($issue: AddProjectCardInput!) {
    addProjectCard(input: $issue) {
      cardEdge {
        node {
          id
        }
      }
      projectColumn {
        id
      }
      clientMutationId
    }
  }
`
```

### MoveProjectCard

Move a project card to a different column. This produces a side-effect since we’re updating the project column.

```javascript
module.exports = `
  mutation MoveProjectCard($card: MoveProjectCardInput!) {
    moveProjectCard(input: $card) {
      cardEdge {
        node {
          id
        }
      }
      clientMutationId
    }
  }
`
```

Fields like cardEdge are provided on a mutation request to select what the server will return to you once the mutation operation is complete.

### DeleteProjectCard

Delete a card from a project.

```javascript
module.exports = `
  mutation DeleteProjectCard($card: DeleteProjectCardInput!) {
    deleteProjectCard(input: $card) {
      deletedCardId
    }
  }
`
```

Here’s you’re asking the server to return the deletedCardId once the deleteProjectCard mutation is complete.

Now that you have the queries and mutations and are sure they work, we need to set up the project locally and bring it all together.

### Set up our project locally

Let’s wire this thing up!
> [You can checkout the code on github](https://github.com/pauldariye/kanbanize) or [remix it on glitch](https://glitch.com/edit/#!/remix/kanbanize/ca1589ea-ae22-4483-a2ee-c0b4c426e43f).

    [kanbanize](https://github.com/pauldariye/kanbanize)
    ├── README.md
    ├── actions
    │   ├── index.js
    │   ├── labeled.js
    │   └── unlabeled.js
    ├── bin
    │   ├── start-dev.sh
    │   └── start-ngrok.js
    ├── config
    │   ├── components
    │   └── index.js
    ├── deploy.sh
    ├── graphql
    │   ├── index.js
    │   ├── mutation
    │   └── query
    ├── index.js
    ├── lib
    │   ├── crypto.js
    │   └── github.js
    ├── now.json
    ├── package.json

Here’s our project structure. You can try to recreate this or [clone it from GitHub](https://github.com/pauldariye/kanbanize). We’ll go through each relevant module.

If you’re recreating it run the following code:

    mkdir kanbanize && cd kanbanize && yarn init -y # create a ne directory

    mkdir actions app bin config graphql lib # create subdirectories

    yarn add micro crypto graphql-request github-api joi async # install dependencies

    yarn add micro-dev dotenv-safe nodemon ngrok concurrently --dev # install devDependencies

If you’re cloning, run the following in your terminal:

    git clone [git@github.com](mailto:git@github.com):pauldariye/kanbanize.git

    cd kanbanize && yarn # install dependencies

    cp .env.example .env # Enter the env variables

    yarn dev             # Run dev server; Visit https://localhost:3000

Again, to save time, we’ll go through only important bits of the code.
> [You can checkout the code on github](https://github.com/pauldariye/kanbanize) or [remix it on glitch](https://glitch.com/edit/#!/remix/kanbanize/ca1589ea-ae22-4483-a2ee-c0b4c426e43f).

## Our “app”

This is your main server file that uses [micro](https://zeit.co/blog/micro-8), a small and performant library for building asynchronous HTTP services built by the amazing team at [Zeit](https://zeit.co). As you can see, the entire app is just one asynchronous function. No big deal!

<script src="https://gist.github.com/pauldariye/0f03b007cb50166c13e2086581ef766e.js"></script>
```javascript
const { json, send, text } = require('micro')
const micro = require('micro')
const config = require('../config')
const actions = require('../actions')
const { signRequestBody } = require('../lib/crypto')
/**
* Main request handler
* @param {Object} req HTTP request object
* @param {Object} res HTTP response object
* @returns {Object} Updated server response object
*/
const app = async (req, res) => {
  if (req.headers['content-type'] !== 'application/json') {
    return send(res, 500, { body: `Update webhook to send 'application/json' format`})
  }

  try {
    const [payload, body] = await Promise.all([json(req), text(req)])
    const headers = req.headers
    const sig = headers['x-hub-signature']
    const githubEvent = headers['x-github-event']
    const id = headers['x-github-delivery']
    const calculatedSig = signRequestBody(config.github.secret, body)
    const action = payload.action
    let errMessage

    if (!sig) {
      errMessage = 'No X-Hub-Signature found on request'
      return send(res, 401, {
        headers: { 'Content-Type': 'text/plain' },
        body: errMessage })
    }

    if (!githubEvent) {
      errMessage = 'No Github Event found on request'
      return send(res, 422, {
        headers: { 'Content-Type': 'text/plain' },
        body: errMessage })
    }

    if (githubEvent !== 'issues') {
      errMessage = 'No Github Issues event found on request'
      return send(res, 200, {
        headers: { 'Content-Type': 'text/plain' },
        body: errMessage })
    }

    if(!id) {
      errMessage = 'No X-Github-Delivery found on request'
      return send(res, 401, {
        headers: { 'Content-Type': 'text/plain' },
        body: errMessage })
    }

    if (sig !== calculatedSig) {
      errMessage = 'No X-Hub-Signature doesn\'t match Github webhook secret'
      return send(res, 401, {
        headers: { 'Content-Type': 'text/plain' },
        body: errMessage })
    }

    if (!Object.keys(actions).includes(action)) {
      errMessage = `No handlers for action: '${action}'. Skipping ...`
      return send(res, 200, {
        headers: { 'Content-Type': 'text/plain' },
        body: errMessage })
    }

    // Invoke handler
    actions[action](payload)

    return send(res, 200, {
      body: `Processed '${action}' for issue: '${payload.issue.number}'`
    })
  } catch(err) {
    console.log(err)
    send(res, 500, { body: `Error occurred: ${err}` })
  }
}
const server = micro(app)
server.listen(3000)
```

Here are notes on what the **app** function (request handler) does:

* It the **content-type** delivered to our web-hook to ensure it is **application/json** like we configured in our web-hook configuration. [LC14]

* It validates the request for the presence of an **x-hub-signature**. [LC28]

* Highlight this if you’ve read this far (trying to see who my real friends are).

* It validates the request for the presence of an **x-github-event** header and checks that the event type is **issues**. [LC35]

* It validates the request for the presence of an **x-github-delivery** header. [LC49]

* It checks that the x-hub-signature sent in the request body is the right one by comparing the hash value you get to validate the request body using the signRequestBody method with the secret key you created when configuring the web-hook . [LC56]

* It checks that you have a defined handler for the payload action. [LC63]

* Finally, it invokes your handler for the payload action. [LC71]

```javascript
const crypto = require('crypto')
/**
* Sign request body using secret and HTTP request body
* @param {string} key Secret key
* @param {body} body HTTP request body
* @returns {string} Generate hash code
*/
function signRequestBody (key, body) {
  return `sha1=${crypto.createHmac('sha1', key).update(body, 'utf-8').digest('hex')}`
}

module.exports = { signRequestBody }
```

The **signRequestBody** function generates a cryptographically signed hash-based message authentication code (HMAC) with a given key (web-hook secret) and string (our request body).

```javascript
const async = require('async')
const Github = require('github-api')
const { GraphQLClient } = require('graphql-request')
const { query, mutation } = require('../graphql')
const config = require('../config')
const { token, repo, owner } = config.github

const issues = new Github({ token }).getIssues(`${owner}/${repo}`)
const graphqlClient = new GraphQLClient('https://api.github.com/graphql', {
  headers: { Authorization: `bearer ${token}`, }
})

const baseVariables = { owner, name: repo }

/**
* Remove labels with duplicate descriptions, i.e 'status' or 'project'
* @param {Object} { label, object } issue and label objects
*/
const removeDups = async ({ label, issue }) => {
  if (!label) return
  if (!issue) return

  const issueLabels = issue.repository.issue.labels.edges
    .map(label => {
      return {
        name: label.node.name,
        description: label.node.description
      }
    })

  const dups = issueLabels.filter(l =>
    l.name !== label.node.name && l.description === label.node.description)
      .map(l => l.name)

  if (dups.length > 0) {
    const labels = issueLabels.map(l => l.name).filter(l => !dups.includes(l))
    await issues.editIssue(issue.repository.issue.number, { labels })
  }
}

/**
* Add issue to project
* @param {Object} { label, object, issue, project, variables }
*/
const addProjectCard = async ({ label, issue, project, variables }) => {
  if (!project || project.repository.projects.edges.length === 0) return
  if (!issue) return
  if (!variables) return
  if (!label) return

  await removeDups({ label, issue }) // Remove duplicate labels

  const { repository: { issue: { id: contentId } } } = issue
  const projectColumnId = project.repository.projects.edges[0].node.columns.edges[0].node.id || null

  if (contentId && projectColumnId) {
    await graphqlClient.request(mutation.addProjectCard,
      Object.assign({}, variables, {
        "issue": { contentId, projectColumnId }
      })
    )
  }
}

/**
* Remove card from a project
* @param {Object} { card }
*/
const deleteProjectCard = async ({ card }) => {
  if (!card || !card.id) return
  const { id: cardId } = card || null
  await graphqlClient.request(mutation.deleteProjectCard,
    Object.assign({}, baseVariables, {
    "card": { cardId }
    })
  )
}

/**
* Move project card to column by label descriptions, i.e 'status' or 'project'
* @param {Object} { card }
*/
const moveProjectCard = async ({ label, issue, variables }) => {
  if (!label) return
  if (!issue) return
  if (!variables) return

  await removeDups({ label, issue }) // Remove duplicate issues

  const { repository: { issue: { projectCards } } }  = issue

  async.each(projectCards.edges, async ({ node: {
    id: cardId,
    project: { name: projectName },
    column: { id: currentColumnId, name: currentColumnName } } }) => {
    const project = await graphqlClient.request(query.findProjectColumns,
      Object.assign({}, variables, { projectName })
    )
    const { repository: { projects: { edges } } } = project
    async.each(edges, async ({ node: { columns: { edges } } }) => {
      async.each(edges, async ({ node: { id: columnId, name: columnName } }) => {
        if (columnId === currentColumnId) return
        if (columnName.toLowerCase() === currentColumnName.toLowerCase()) return
        if (columnName.toLowerCase() !== label.node.name.toLowerCase()) return
        const projectCardMutationVariables = Object.assign({}, variables, {
          "card": { cardId, columnId }
        })
        await graphqlClient.request(mutation.moveProjectCard,
          projectCardMutationVariables)
      })
    })
  })
}

module.exports = {
  baseVariables,
  issues,
  graphqlClient,
  addProjectCard,
  moveProjectCard,
  deleteProjectCard
}
```

Here you’re initializing an authenticated graphqlClient using [graphql-request](https://github.com/prismagraphql/graphql-request) library and an issues client using the [github-api](https://github.com/github-tools/github) lib which is a wrapper for the GitHub’s REST API.

Now you may be asking yourself why you’re using the REST API after all the spiel I gave earlier on the merits of GraphQL. Great question and thought! As with any new technology or paradigm, it takes some time to retroactively replace what was formerly in place. You can read more about [why GitHub decided to move to GraphQL](https://githubengineering.com/the-github-graphql-api/) and track the [GraphQL schema changelog](https://developer.github.com/v4/changelog/) to learn more. A more straightforward answer is that we need the REST API to be able to update our github issue, i.e to ensure we have only one status or project label at a time.

Other notes about code in thelib/github.js module:

* removeDups : This function checks to see if an issue has other labels besides the recently labeled that have a project or status description and removes them. [LC19]

* addProjectCard : This function adds a project name that matches the label name with description project. [LC45]

* deleteProjectCard: This function removes a card from a project card. [LC69]

* moveProjectCard : This function moves a card to a project column that a label name with description status. [LC83]

```javascript
/**
* 'labeled' event handler
* @param {Object} payload Github event payload
*/
const { query } = require('../graphql')
const {
  graphqlClient,
  addProjectCard,
  moveProjectCard,
  baseVariables
} = require('../lib/github')
module.exports = async (payload) => {
  const { issue: { number }, label: { name } } = payload
  const variables =  Object.assign({}, baseVariables, {
    number, projectName: name
  })

  const [issue, project] = await Promise.all([
      graphqlClient.request(query.findIssue, variables),
      graphqlClient.request(query.findProject, variables)
  ])

  const label = issue.repository.issue.labels.edges
    .find(label => label.node.name === name)

  const { description } = label.node

  switch(description) {
    case 'project':
      await addProjectCard({ label, project, issue, variables })
      break
    case 'status':
      await moveProjectCard({ label, issue, variables })
      break
    default:
  }
}
```

Here you’re handling adding a card to a project and moving the card along project columns using the ‘labeled’ event (action) function which accepts the event payload from GitHub.

The handler does the following:

* It finds the issue with the number matching the one received from the event payload and a project by name (or label) using the queries we defined earlier. [LC18]

* It then checks the issue’s description to either addProjectCard for a project label or moveProjectCard for a project status label. [LC24]

```javascript
/**
* 'unlabeled' event handler
* @param {Object} payload Github event payload
*/
const { query } = require('../graphql')
const {
  graphqlClient,
  deleteProjectCard,
  baseVariables
} = require('../lib/github')
module.exports = async (payload) => {
  const { issue: { number }, label: { name } } = payload
  const variables =  Object.assign({}, baseVariables, {
    number, projectName: name
  })

  const issue = await graphqlClient.request(query.findIssue, variables)
  if (issue.repository.issue.projectCards.edges.length === 0) return

  const card = issue.repository.issue.projectCards.edges[0].node
  if (card.project.name === name) {
    await deleteProjectCard({ card })
  }
}
```

Here you’re handling what happens when a label with a project description is removed from a card. In this case we deleteProjectCard from the project board.

## Summary

That’s it! Of course this is only the tip of the iceberg when it comes to what you can do with Github and other tools like it (Gitlab, bitbucket, etc) to bring your software development process ever closer to you codebase. Give this library a try and [let me know what you think](https://twitter.com/@pauldariye). Feel free to contribute more custom actions.
> [You can checkout the code on github](https://github.com/pauldariye/kanbanize), [remix it on glitch](https://glitch.com/edit/#!/remix/kanbanize/ca1589ea-ae22-4483-a2ee-c0b4c426e43f), or [deploy a working instance for repository with zeit/now](https://deploy.now.sh/?repo=https://github.com/pauldariye/kanbanize&env=TOKEN&env=WEBHOOK_SECRET&env=OWNER&env=RESPOSITORY).

Some noteworthy projects that integrate nicely with Github to give you much more powerful project management features include:

1. [Zenhub](https://www.zenhub.com/) — Agile Project Management for Github

1. [Waffle.io](https://waffle.io/)–Developer-first Project Management for Teams on Github

Be sure to check these out as well.

Sincere thanks to [Tams Sokari](https://medium.com/@tamssokari), [Solomon Osadolo](https://medium.com/@Soloxpress) and Akinjide Bankole for reviewing and proofreading this post.

**Say hi on [twitter](https://twitter.com/@pauldariye).**

[screenshot-of-github-project-board]: {{{relativePath}}}/screenshot-of-github-project-board.png "Screenshot of fully configured project board using kanbanize"
[kanbanize-project-boards]: {{{relativePath}}}/kanbanize-project-boards.png "A list of Github Projects for kanbanize."
[kanbanize-video]: {{{relativePath}}}/kanbanize.mp4
