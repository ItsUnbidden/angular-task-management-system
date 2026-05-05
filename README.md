# Task Management System

The goal of the project was to provide a comprehensive system for developers of large projects to better coordinate and track their progress. This is the **frontend** part of a *full-stack* project and it only works with my *Spring Boot* **backend**, and if you're interested in checking that out, you can follow [this link](https://github.com/ItsUnbidden/jv-task-management-system) to its dedicated **GitHub** page. The frontend provides the UI for all of the backend's features which include things such as:
- Cookie-based JWT authentication with refresh tokens and CSRF protection
- Two differently scoped role systems: one for the app as a whole, and one for individual projects
- The core project-related features:
    - Public and private projects
    - An internal messaging system with comments and replies
    - Tasks can be assigned to specific project members
    - Automatic status tracking using project and/or task deadlines
    - Customizable labels for task sorting
- OAuth2 support for optional features:
    - Dropbox for task attachments
    - Google Calendar for notifications

After I've finished the basic UI, I've been using the system myself to better track my progress on this very project and look at it from the user's perspective. Not everything is implemented and there are definitely bugs still present, but I'm actively working on new features and fixing bugs when I find them. Due to the constant improvements and small revamps I might not always be able to keep this README precisely up to date, so some things might be different in the real app from what is described or shown here.

## Tech stack
Generally, I used the modern Angular approach, so the frontend mainly uses these technologies:
- Angular Framework
- Angular Material
- RxJS
- Zoneless approach with signals
- Standalone components
- CSS and SCSS
- Cookie-based JWT auth flow with refresh tokens

## Architecture
In this section I'll highlight some key architectural decisions I've made.

### Structure
Here is the app's main endpoints:
- `/auth` — log in and sign in
- `/dashboard` — overview of the user's projects and tasks, as well as of public projects
- `/projects/{projectId}` — the main project page
- `/projects/{projectId}/tasks/{taskId}` — an expanded task page

The auth page is a mix of log in and sign in. The user can toggle the current mode by pressing a button at the bottom of the card.

The project page consists of the overview section and the task grid. Here the user can edit project properties, such as: name, description, dates, etc. The running theme with editing properties is that it can be done inline by pressing a special button near the property.

The task grid is a collection of task cards with some basic task information. The cards can be clicked in order to open that task's dedicated page.

The task page consists of the task's properties, attachments (if Dropbox is connected), and messages.

### Authentication
Authentication is implemented using HttpOnly cookies. There are three cookies: short-lived JWT token, a long-lived refresh token, and a CSRF token. This system is quite convenient, since it allows for the user to stay logged in for a long time without sacrificing too much security. A general authentication flow goes like this:
1. User logs in on the `/auth` page.
2. All three tokens get set by the backend.
3. Short lived tokens are used for authentication on secure endpoints. Components are secured using an `AuthGuard` that caches the current user and, if successfull or already present, allows access.
4. If the backend sends a 401 response code, an interceptor will attempt to refresh the short lived token with a refresh token, then repeat the original request if successfull.
5. If it fails, the user is sent to the auth page to reauthenticate.

Of course, in order to log in the user has to register an account first. That can also be done on the `/auth` page. After that, a request to log in will be sent automatically.

### Caching
The app uses a lot of caching in order to avoid constant HTTP requests. Basically every entity is cached at some point. In order to implement this as cleanly as possible I've added special `Store` classes that store the current state of the entity or a page of entities. By "state" I mean things like whether an item is being loaded, error, page index, page size, sorting, etc. 

Here are some examples of caching:
- Tasks and projects are cached on the dashboard. Then when the user opens a certain project it is not loaded by ID with an HTTP request. Instead, it's pulled from the dashboard cache, making the UI a little more responsive. The same goes for tasks.
- Labels are reused aggressively too. They are always loaded when the user opens a project. Then when a task is selected, instead of loading labels for that specific task, the required labels are pulled from the existing cache.
- The user is cached during log in, and then reused by the `AuthGuard` for secure components, avoiding reloading them every time for no real gain.

Caching has some difficulties too. I've revamped the system at least two times, because it's pretty difficult to keep things consistent. It's not always clear where the state should be: component, store, service? The latest iteration with stores took a lot of time to implement, but it seems to work well. It's also important to not get too excited and forget to reload things when it's actually required. For example, if the user updates something, it's generally a good idea to reload it to keep the state up to date with the backend.

### Pagination and sorting
The app has quite a few tables and grids that require pagination. The easy way to deal with this is to load all of the entities from the backend and then do all of the pagination and sorting localy. The problem with this is that it's not really a reasonable approach when the amount of data gets large. If there are 1000 public projects, pulling all of them from the DB, sending them over an HTTP request, and then storing them in the browser only for the user to be able to find one specific project doesn't make much sense. So, all of the actual paging and sorting is done on the server, and only a limited amount of data is transfered per request.

Here are some examples of components that use pagination:
- Dashboard for projects and tasks
- Task grid on the project page
- User list for managers
- Messages

Pagination is not used everywhere, though:
- Labels 
- Attachments

Those do not use pagination, because they are small entities and I do not expect a lot of them to ever be present in a single project or task. Unnecessary control elements would probably be more confusing than usefull.

### Errors and validation
Error responses are indentified using a special `type` parameter sent by the backend. This is an `enum` value that gives a more precise idea of what went wrong than a status code. Currently, this type is what decides the message that will be sent to the user. The system is very centralized and easy to use, but it's not very flexible and might not provide the exact reason. Technically, it should be possible to make custom messages for every situation in every request, but it's still in progress.

Depending on the case, the errors are either presented as a special text element on the page, or as a snack bar. 

Validation is handled by the frontend with the backend being the last line of defence. The policy is that the frontend should identify all validation issues before the request is even sent.

External services, like Dropbox, are the part that is outside of my control, so errors produced by them are unpredictable. Since those services are optional, I've designed their integration in a way that does not block the actual operation of the app if something fails there. That is communicated by a special response with information about how the external operation went, therefore allowing the frontend to react accordingly. This system is not currently fully implemented, but it will be in the future.

## Future improvements
There are quite a few things I would like to add after I'm done fixing major bugs. Here are some of them:

### Subtasks and progress bars
While using the system myself, I'd found out that tasks can accidentally become too big. When that happens, it becomes hard to track progress. It would be great to add an ability to add small subtasks to tasks that you can independently check as completed. That could also be expanded to adding a progress bar for tasks, where completing each subtask contributes to the bar. Even more, projects themselves can have a progress bar, the value of which corresponds to the combined progress of all of the tasks. 

### Async external operations
Some external service operations take too long. For example, connecting a project with many users to Dropbox may take forever. This can be solved by making these tasks run in the background.

### Theming
Angular Material allows for advanced theming to make things look pretty good. This is not really a priority for me right now, but I might take this on later.
