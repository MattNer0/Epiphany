<template lang="pug">
	.modal-mask(v-show="show")
		.modal-background(@click="clickout_close")
		.modal-wrapper
			.modal-container.modal-image(v-if="image_url")
				div(ref="imagemodal", @click="clickout_close")
					img(:src="image_url")
			.modal-container(v-else)
				h3 {{ title }}
				p(v-html="descriptionHtml")
				form(@submit.prevent="button_submit(buttons[0])")
					.modal-prompts
						.modal-field(v-for="field in prompts")
							span.modal-field-label {{ field.label }}
							.modal-input
								input(
									:type="field.type === 'password' && !showPassword ? 'password' : 'text'"
									v-model="field.retValue"
									:name="field.name"
									v-on:contextmenu="contextMenu"
								)
								button.toggle-password-button(v-if="field.type === 'password'" @click.prevent="togglePassword" type="button")
									i.coon-eye-off(v-if="showPassword")
									i.coon-eye(v-else)
							password(
								v-if="field.type === 'password'"
								:strength-meter-only="true"
								v-model="field.retValue"
							)
					.modal-buttons
						template(v-for="button in buttons")
							button.modal-button(@click.prevent="button_submit(button)", type="button") {{ button.label }}
</template>

<script>
import Password from 'vue-password-strength-meter'
import { remote } from 'electron'

export default {
	name: 'modal',
	data() {
		return {
			show        : false,
			title       : '',
			description : '',
			image_url   : '',
			showPassword: false,
			image_width : null,
			image_height: null,
			buttons     : [],
			prompts     : [],
			okcb        : undefined
		}
	},
	components: {
		Password
	},
	computed: {
		descriptionHtml() {
			return this.description ? this.description.replace(/\n/g, '<br/>') : ''
		},
		promptsObject() {
			var obj = {}
			for (var i = 0; i < this.prompts.length; i++) {
				obj[this.prompts[i].name] = this.prompts[i].retValue
			}
			return obj
		}
	},
	methods: {
		init(title, description, buttons, prompts) {
			this.title = title
			this.description = description
			this.buttons = buttons
			this.prompts = prompts
			this.image_url = ''
			this.show = true

			setTimeout(function() {
				var pswd = document.querySelector('.VuePassword__Input input')
				if (pswd) pswd.focus()
			}, 100)
		},
		image(url, width, height) {
			this.reset_data()
			this.image_url = url
			this.image_width = width
			this.image_height = height
			this.show = true

			document.addEventListener('keydown', this.escKeydown)
		},
		escKeydown(event) {
			switch (event.key) {
				case 'Escape':
					this.clickout_close()
					break
			}
		},
		reset_data() {
			this.title = ''
			this.description = ''
			this.buttons = []
			this.prompts = []
			this.image_url = ''
			this.show = false
			document.removeEventListener('keydown', this.escKeydown)
		},
		clickout_close() {
			if (this.buttons.length < 2 && this.prompts.length === 0) {
				this.show = false
				this.reset_data()
			}
		},
		togglePassword() {
			this.showPassword = !this.showPassword
		},
		button_submit(button) {
			if (button.cancel) {
				this.show = false
			} else if (this.prompts) {
				for (var i = 0; i < this.prompts.length; i++) {
					if (this.prompts[i].required && !this.prompts[i].retValue) return false
				}
				if (button.validate) {
					var validationFailed = button.validate(this.promptsObject)
					if (validationFailed) return false
				}
				this.show = false
			} else {
				this.show = false
			}

			if (button.cb) button.cb(this.prompts ? this.promptsObject : null)
			this.reset_data()
		},
		contextMenu() {
			var inputMenu = remote.Menu.buildFromTemplate([{
				label: 'Undo',
				role : 'undo'
			}, {
				label: 'Redo',
				role : 'redo'
			}, {
				type: 'separator'
			}, {
				label: 'Cut',
				role : 'cut'
			}, {
				label: 'Copy',
				role : 'copy'
			}, {
				label: 'Paste',
				role : 'paste'
			}, {
				type: 'separator'
			}, {
				label: 'Select all',
				role : 'selectall'
			}])
			inputMenu.popup()
		}
	},
	watch: {
		image_url() {
			this.$nextTick(() => {
				if (this.$refs.imagemodal) {
					const win = remote.getCurrentWindow().getBounds()
					if (win.width > this.image_width) {
						this.$refs.imagemodal.style.width = this.image_width + 'px'
					}
					if (win.height > this.image_height) {
						this.$refs.imagemodal.style.height = this.image_height + 'px'
					}
				}
			})
		}
	}
}
</script>
