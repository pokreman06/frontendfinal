# frontendfinal
## Tools
1. https://github.com/HagaiHen/facebook-mcp-server as my way to interact with facebook
## Plan
The plan that I have is to create an agent that will help me create meaningful, uplifting, and philosophical posts by using artificial inteligence to search a text and find something syntactically associated with a certain Idea or question. The agents involvment could be minor (finding semantically similar ideas and return page rows), moderate (both finding relavant text and also recommending possible places or free books to find text as well as creating an image or cartoon that represents that), to major (total post creation, suggestion, and submission. The only thing left for the human to do would be to press "post") 
## Requirements

1. Have the agent be able to perform a google search "with my temp google account" for topic relavent pdfs
2. Have the agent be able to search through a given text
3. Have the agent be able to generate relevant image for post
4. Have the agent be able to access facebook account
5. Have the agent be able to access twitter account
6. Have the user be able to specify involvment level
7. Have the user be able to specify image theme/themes (e.g. cartoon, anime, cowboy, realistic)
8. Have the user be able to input their own text into the app to be submitted (ai might use this to make an image but won't otherwise handle or alter the data it will simply be given a key to access it)
9. Have the user be able to look at the agentic calls/logs to see what functions that it used and why
10. Get real time data from the ai agent or rather a contiuous stream of data
    

## Functions

1. Search the internet based on a user defined prompt
2. Pull up a specific site and parse the textual information against a given prompt
3. reference an image generation ai to generate images based on text
4. paste given post into social media sites (facebook and twitter) user confrmation needed
5. Also I don't know if this counts but a place to ask for conformation or validation? ie follow up from the user about any of its inputs

## Pages

1. A page to specify post themes. ie religeous philosophical inspirational financial You should be able to store multiple and upon starting a post you select which one you want to use.
2. A page to manage facebook and twitter accounts putting their login in as well as providing a link to the default accounts in app (not logged in)
3. A page to start a post including prompting for additional context if required
4. A view to look at generated images as well as being able to write or modify accompanying text.
5. A view to look at final post (image with accompanying texts or hashtags) as well as a button to post it
6. A page to look at the agentic logs
7. A page to specify AI involvment as well as check/uncheck certain features that you want the ai to perform
8. A view to specify image themes or use a custom collection of themes
9. A page to manage collections of image themes
10. A page to manage source materials including links to pdf articles or internet articles (html pages)
11. A page to donate to the agentic creator (me I want money)


## Project Schedule

### Oct 29

#### Estimates:

Rubric items:  
- CI/CD pipeline I want my CI/CD pipeline to submit a very basic form of my app alongside layout into an app hosted on the class kubernetes server
- I also want to get tests implemented in my CI/CD pipeline

Features:
- I want to get a very basic Hooked up thing to start generating images

#### Delivered

Rubric items:  
- CI/CD pipeline I want my CI/CD pipeline to submit a very basic form of my app alongside layout into an app hosted on the class kubernetes server
I got about half of this working soo...
This might be a week of me trying to do
### Nov 1

#### Estimates  

Rubric Items:
- Error handling: get toasts working for all failed requests

Features:

#### Delivered

Rubric Items
- I got the app hosted on the kubernetes server
- I got a toaster/apiClient set up on my project

### Nov 5

#### Estimates  

Rubric Items: 
- Data Persistance design database for image and user info
- Hook up with chat ai

Features:
- Have backend communicate with the image generator to "pass that along"
- Make the page size modular for the image screen


## Delivered
Set up the database for persistance and I have alot of the stuff in place for frontend security.



### Nov 8

#### Estimates  

Rubric Items: 
- Input: work on getting a simple page to make requests start with image generation/use generic form
- Error handling on api errors

Features:
- an Image generation ai: hook up the app to the image generator host locally
- Make another screen for ai chatting but specifically for word creation purposes

### Nov 12

#### Estimates  

Rubric Items: 
- Work on getting ai hooked up with FB with https://github.com/HagaiHen/facebook-mcp-server

Features:
- Make a specify image themes page
- manage collection of image themes

### Nov 15

#### Estimates  

Rubric Items: 
- Work on hooking ai up with internet search capabilities

Features:
- Make a specify post themes page

### Nov 22

#### Estimates  

Rubric Items: 
- pull textual data: 
Features:
- have the agent be able to pull textual data from sites or pdf links to parse
- final post page: page to treat with final post
  

### Nov 25

#### Estimates  

Rubric Items: 
- linting in pipeline: if not already done
- generic form input for "themes"

Features:
- page to start post: calls ai once then navigates to another page
  

### Dec 3

#### Estimates

Rubric Items: 
- Authorized pages: create admin account page to access generic facebook account
- use local storage

Features:
- create login page
- hook login page up to backend

### Dec 3

#### Estimates

Rubric Items: 
- Authorized pages: create admin account page to access generic facebook account
- use local storage

Features:
- create login page
- hook login page up to backend

### Dec 6

Rubric Items:
- remaining pages: logs/donate to me :)
- manage source materials page:
- Make mobile friendly
- 



