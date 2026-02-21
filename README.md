# Aemula

A decentralized platform for independent journalism on a mission to rebuild trust and reverse polarization in media. 

## Executive Summary

For this hackathon, we are building two AI-powered UI features to serve the two core user groups of Aemula, journalists and readers. The two features — **Agentic Editorial Review** and **Ideological Vector Search** — are designed to showcase novel interface patterns where Claude and Redis Vector Search drive the UI logic itself, not just the content. The editorial review transforms the writing-to-publishing workflow into a structural block-editing paradigm orchestrated by AI. The vector search visualizes ideological proximity in 3D space and morphs between contextual and ideological ranking views.

## Demo App
[demo.aemula.com](https://demo.aemula.com)

## What was completed in this hackathon

**Prior to Hackathon**

We took a snapshot the user and article nodes from our production graph database, created node embeddings based on their context and their ideological relationships (generated through user interactions with articles on the platform), and loaded the vector indexes to our Redis Cloud database.

We also created our company logo prior to the hackathon.

**In Hackathon**

We built out the full demo app seen in the link above. This includes

**Publish**

This is the core Agentic Editorial Review feature:

- Draft Editor
	- Notion-style text editor using milkdown/crepe to allow journalists to draft an article
	- We also include stored drafts to use for demo purposes
- Agentic Editorial Review
	- Utilizes a multi-model review process to mimic the types of editorial reviews conducted in professional newsrooms
	- Sonnet - Deconstructs the article into its component "blocks"
		- Blocks represent the core ideas and claims that construct the overall structure of the article
		- Reviews blocks for any issues
			- Grammar/spelling
			- Claims that need additional sources for support
			- Claims that would benefit from addressing counter-arguments
			- Redundant topics or ideas
			- Blocks that should be reordered to improve the overall flow of the article
	- Haiku - Provides source search
		- Allows journalists to search for sources based on their claims and directly cite them in the article
	- Opus - Polishing the article
		- Once the blocks of the article are edited, reordered, removed, or added, we pass the article through Opus to polish the article so all of the edited blocks flow together well
		- We can utilize long context windows to ensure the Opus polishing edits align with the journalists voice from their previous work
- Ideological Vector Search
	- We use two vector indexes in Redis Vector Search to allow users to search for articles
	- Contextual Vectors
		- Discover articles that discuss relevant topics
	- Ideological Vectors
		- Utilize a user's interaction history with articles on the platform to understand how they relate to other users and journalists in terms of their ideological alignment
		- We construct a graph database from these interactions to generate node embeddings for users and articles
	- Ideological Vectory Search
		- First uses contextual vectors to discover relevant articles
		- Compares those articles to the ideological vector space to rank them based on their proximity to the user
	- Allow the user to read articles directly in the vector explore graph and ideological rankings

## Why

- Agentic Editorial Review
	- Journalists don't want to use AI to draft their work
		- Journalists are getting called out on social media if their work appears to be LLM-generated
	- Journalists do need to leverage AI to more productively conduct reporting
		- More from an editorial/collaborative perspective
		- structure/refinement/sourcing/citations
		- Peer-editorial is slow and requires splitting article revenue with editors
		- Agentic editorial review is fast, credible, and gives journalists an experience more similar to editorial reviews in a professional newsroom
- Ideological Vector Search
	- To reverse the trend of polarization in media, we allow users to freely explore diverse opinions to discover new perspectives
	- We avoid over-categorization by trying to determine alignment with left vs. right politics
	- Instead, we use platform interactions to create high-dimensional vectors to understand the nuance of who agrees with whom
	- Allowing users to explore their biases in these ideological vector space encourages interactions with articles that challenge their current worldview

## Project Spec

- User can draft an article with a notion-style text editor
- User can enter editorial mode
	- Reorder contextual blocks
	- Review suggested citations/sources
		- External/RAG
		- Internal, Aemula articles
			- Competing points of view to address counter-arguments
	- Receive recommended collaborators
	- Incorporate suggestions
	- Automatically publish draft using their writing style
- User can search articles
	- 3D rendering of ideological vector space
	- Semantic searching
		- Finds related articles in contextual vector space
		- Pulls top results, cross-references ideological vector space
		- Returns results in order of proximity


*For the full project spec, read Spec.md*

## Architecture

- Static Aemula Neo4j export to node embeddings in Redis
- Store articles locally (or in simple Supabase depending on size - think its small)
- Nextjs/Tailwind frontend, simple Vercel deployment
- Nextjs server-side API routes to Claude/Redis


## Implementation & Future Features

**What we didn't get to accomplish**

- Counter-argument search using Redis agentic memory to connect journalists with other journalists covering similar topics from competing points of view as they are drafting articles
- Cmd/ctrl + k prompting to Claude within the text editor
	- Allow a user to highlight text and type prompts to get feedback from Claude in a side-pane view when drafting articles

**Implementation**

- We plan to implement these features in our production app in the comings weeks
- Agentic editorial review wsa costing ~$0.11 during testing, which is significantly cheaper than peer-editorial
	- Journalists could charge to their earnings balances (held in USDC) and use x402 payments to conduct each review
- Replace our current explore page (using a Redis cache of our Neo4j bipartite graph data to create a force graph) with actual vector indexes to more accurately represent the ideological vectors in our Perspective Map
- Incorporate ideological vector search so it is easier for users to find articles they are interested in reading

**Feature Pipeline**

- RAG retrieval geared to tailor responses to individual users
	- Users can prompt Claude with questions, and Claude can utilize Aemula's ideological vector search to return articles that are near a user's current point of view when using RAG-enabled citations
	- What is the best answer?
		- The consensus truth when it can be so far from a user's current perspective that they immediately discredit it
		- Or the perspective closest to the consensus truth that a user is willing to accept and incorporate into their worldview
	- We should not optimize answers for monolithic truth
	- We should optimize answers for most progress towards an accepted consensus truth over time
- Source & Research Marketplaces
	- Use source and research prediction markets to determine what resources are in demand
		- Using agent memory servers to understand active work across journalists and contributors 
	- Immediately connect journalists working on similar stories with users able to provide source material or research
	- Seamlessly license and incorporate information for split shares of article earnings