# Watchlist Manager

## Overview
The Watchlist aggregates saved videos, tracking progress locally and synchronizing heavily with the NestJS storage. 

## Features
- Save for Later queue.
- Currently Watching queue (dynamically mapped heavily to VOD progression numbers).

## Core Mechanisms
We optimistically append to the Watchlist state locally while the Mutex `apiFetch` lock manages the API handshake in the background.

## UI Bindings
Exposed primarily through `WatchlistToggle` components sprinkled everywhere (video cards, video player overlay, and profile views).
