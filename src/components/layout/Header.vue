<template>
	<header>
		<div class="title clipped-x-large-forward">
			<img class="logo" src="/faction-logos/Broadsword111.png" />
			<div class="title-container">
				<div id="title-first-line" class="title-row">
					<span id="title-header">{{ header.headerTitle }}</span>
					<span id="title-subheader">{{ header.headerSubtitle }}</span>
				</div>
				<div class="title-row">
					<span id="subtitle-header">{{ header.subheaderTitle }}</span>
					<span id="subtitle-subheader">// {{ header.subheaderSubtitle }}</span>
				</div>
			</div>
		</div>

		<div class="rhombus"></div>

		<div class="planet-location-container">
			<video autoplay muted loop width="90px" height="90px">
				<source :src="`${planetPath}`" type="video/webm" />
			</video>

			<div class="location-info">
				<!-- ROW 1 -->
				<div class="location-row grid">
					<div id="year">
						<h4>Year</h4>
						<span class="subtitle">{{ header.year }}</span>
					</div>

					<div id="status" class="span-2">
						<h4>Status</h4>
						<span class="subtitle">{{ header.status }}</span>
					</div>
				</div>

				<!-- ROW 2 -->
				<div class="location-row grid">
					<div id="AO">
						<h4>AO</h4>
						<span class="subtitle">{{ header.AO }}</span>
					</div>

					<div id="planet">
						<h4>Planet</h4>
						<span class="subtitle">{{ header.planet }}</span>
					</div>

					<div id="system">
						<h4>System</h4>
						<span class="subtitle">{{ header.system }}</span>
					</div>
				</div>
			</div>
		</div>
	</header>
</template>

<script>
export default {
	props: {
		planetPath: { type: String, required: true },
		header: { type: Object, required: true },
	},
};
</script>

<style scoped>
/* Align both rows to the same 3-column grid */
.location-row.grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	column-gap: 1.2rem;
	align-items: end;
}

/* Status spans Planet + System columns */
.span-2 {
	grid-column: span 2;
}

/* Keep visual consistency */
.location-row h4 {
	text-transform: uppercase;
	letter-spacing: 0.12em;
	font-size: 0.7rem;
}

.subtitle {
	font-size: 0.85rem;
	letter-spacing: 0.08em;
}
</style>
