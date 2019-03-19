<template lang="pug">
	.flashmessage-list
		p.flashmessage-message(v-for="message in messages", transition="flashmessage-message", :class="[message.level]")
			template(v-if="message.url")
				a(href="#", v-bind:onclick="openUrl(url)") {{ message.text }}
			template(v-else)
				| {{ message.text }}
</template>

<script>
export default {
	name   : 'flashmessage',
	props  : ['messages'],
	methods: {
		openUrl(url) {
			require('electron').shell.openExternal('' + url + '')
		}
	}
}
</script>
