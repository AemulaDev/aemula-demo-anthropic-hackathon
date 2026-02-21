# Aemula

A decentralized platform for independent journalism on a mission to rebuild trust and reverse polarization in media. 

## Hackathon Scope

The demo built during this hackathon is to 

## Executive Summary

We are building two AI-powered UI features for Aemula, a decentralized independent journalism platform. The two features — **Agentic Editorial Review** and **Ideological Vector Search** — are designed to showcase novel interface patterns where Claude drives the UI logic itself, not just the content. The editorial review transforms the writing-to-publishing workflow into a structural block-editing paradigm orchestrated by AI. The vector search visualizes ideological proximity in 3D space and morphs between contextual and ideological ranking views.

## Project Spec

- User can draft an article
	- command + k to open chat window
		- highlighting text includes as input
- User can enter editorial mode
	- Reorder contextual blocks
	- Review suggested citations/sources
		- External/RAG
		- Internal, Aemula articles
			- Competing points of view to address counter-arguments
	- Receive recommended collaborators
	- Incorporate suggestions
	- Automatically publish draft using their writing style
- User can publish an article?
	- Just format into our demo file structure and add to embeddings
- User can search articles
	- 3D rendering of ideological vector space
	- Semantic searching
		- Finds related articles in contextual vector space
		- Pulls top results, cross-references ideological vector space
		- Returns results in order of proximity

## Architecture

- Static Aemula Neo4j export to node embeddings in Redis
- Store articles locally (or in simple Supabase depending on size - think its small)
- Nextjs/Tailwind frontend, simple Vercel deployment
- Nextjs server-side API routes to Claude/Redis


## Why

- Editing tool
	- Journalists don't want to use AI to draft their work
		- dude who just got roasted for using AI recently
	- Journalists do need to leverage AI to more productively conduct reporting
		- More from an editorial/collaborative perspective
		- structure/refinement/sourcing/citations


## For the future

- Feature Pipeline
	- RAG retrieval geared to tailor responses to individual users
		- What is the best answer?
			- The consensus truth when it can be so far from a user's current perspective that they immediately discredit it
			- The perspective closest to the consensus truth that a user is willing to accept and incorporate into their worldview
		- We should not optimize answers for monolithic truth
		- We should optimize answers for most progress towards an accepted consensus truth over time
	- Source & Research Marketplaces
		- Use source and research support prediction to determine what resources are in demand
		- Immediately connect journalists working on similar stories with users able to provide source material or research
		- Seamlessly license and incorporate information for split shares of article earnings