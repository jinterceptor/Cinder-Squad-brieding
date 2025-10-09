<template>
	<div
		id="eventsView"
		:class="{ animate: animateView }"
		:style="{ 'animation-delay': animationDelay }"
		class="content-container"
	>
		<!-- EVENTS LIST -->
		<section id="events" :class="{ animate: animate }" class="section-container">
			<div class="section-header clipped-medium-backward">
				<img src="/icons/clockwork.svg" />
				<h1>INTEL</h1>
			</div>
			<div class="section-content-container">
				<div class="events-list-container">
					<Event
						v-for="(item, index) in events"
						:key="item.title"
						:event="withId(item, index)"
						:animate="animate"
						@select-event="selectEvent"
					/>
				</div>
			</div>
		</section>

		<!-- EVENT DETAILS -->
		<section id="events-logs" :class="{ animate: animate }" class="section-container">
			<div style="height: 52px; overflow: hidden">
				<div class="section-header clipped-medium-backward-events-logs">
					<img src="/icons/conversation.svg" />
					<h1>DETAILS</h1>
				</div>
				<div class="rhombus-back">&nbsp;</div>
			</div>
			<div class="section-content-container extra-margins">
				<div class="event" v-if="selectedEvent && selectedEvent.title">
					<div class="name">
						<h1>{{ selectedEvent.location }} // {{ selectedEvent.time }}</h1>
						<h2>{{ selectedEvent.title }}</h2>
					</div>
					<!-- Use preprocessed markdown that supports local event images -->
					<vue-markdown-it :source="localSource" class="markdown" />
				</div>

				<div class="event" v-else>
					<div class="name">
						<h2>[No Event Selected]</h2>
					</div>
					<p class="subtle--text">Please select an event to view its details.</p>
				</div>
			</div>
		</section>
	</div>
</template>

<script>
import { VueMarkdownIt } from "@f3ve/vue-markdown-it";
import Event from "@/components/Event.vue";

export default {
	name: "EventsView",
	components: { VueMarkdownIt, Event },

	props: {
		animate: { type: Boolean, required: true },
		events: { type: Array, required: true },
	},

	data() {
		return {
			selectedEvent: {},
		};
	},

	computed: {
		/**
		 * Preprocess selectedEvent.content to support local images (like EventModal.vue)
		 */
		localSource() {
			if (!this.selectedEvent?.content) return "";

			const id = this.selectedEvent.id || this.selectedEvent.filename || "000";
			const folder = `/events/${id}/`;

			let src = this.selectedEvent.content;

			// Replace local relative image paths (like "map.png") with full folder prefix
			src = src.replace(
				/!\[(.*?)\]\(([^)]+)\)/g,
				(match, alt, path) => {
					if (path.startsWith("http") || path.startsWith("/")) return match;
					return `![${alt}](${folder}${path})`;
				}
			);

			// Legacy single-URL lines → Markdown image
			src = src.replace(
				/^(https?:\/\/\S+\.(?:jpg|jpeg|png|webp|gif|gifv))(?:\?.*)?$/gim,
				(url) => `![](${url})`
			);

			return src;
		},
	},

	methods: {
		/**
		 * Adds an id/index property to events so we know which /events/<id>/ folder to load from.
		 * Your loader can already define `id: "000"` etc.; this ensures a fallback.
		 */
		withId(item, index) {
			if (!item.id && !item.filename) {
				return { ...item, id: index.toString().padStart(3, "0") };
			}
			return item;
		},

		selectEvent(event) {
			this.selectedEvent = event;
		},
	},
};
</script>

<style scoped>
.markdown img {
	display: block;
	max-width: 100%;
	height: auto;
	border-radius: 0.5rem;
	margin: 0.5rem 0 1rem;
}
</style>
