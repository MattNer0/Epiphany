<template lang="pug">
	span
		span
			slot
		transition(:name="animation")
			.my-dropdown-dd(:style="ddStyle" v-show="visible")
				slot(name="dropdown")
</template>

<script>

/**
 * Get the dimensions of `$ele` ele.
 * @param {HTMLElement} $ele
 * @return {object} Object with `width` and `height` properties.
 */
function getSize($ele) {
	const $clone = $ele.cloneNode(true)
	const size = {}

	$clone.style.display = 'block'
	$clone.style.visibility = 'hidden'
	$clone.style.position = 'absolute'
	$ele.parentNode.insertBefore($clone, $ele)
	size.width = $clone.offsetWidth
	size.height = $clone.offsetHeight
	$clone.remove()

	return size
}

/**
 * Set dropdown position.
 * @param {HTMLElement} $link - Html element will show the dropdown when it is pressed.
 * @param {HTMLElement} $dd - Dropdown html element.
 * @param {array} position - Dropdown position.
 */
function setPosition($link, $dd, position, margin) {
	const refSize = getSize($link)
	const cornerPos = {}
	const outStyle = {}
	const origin = {}
	const [p1, p2, p3, p4] = position
	const rect = $link.getBoundingClientRect()
	const refPos = { top: 0, left: 0 }
	const dpSize = getSize($dd)
	const parentPosition = document.defaultView.getComputedStyle($link.offsetParent).position
	let parentRect

	switch (parentPosition.toLowerCase()) {
		case 'fixed':
			refPos.left = rect.left - $link.offsetParent.offsetLeft
			refPos.top = rect.top - $link.offsetParent.offsetTop
			break

		case 'absolute':
			parentRect = $link.offsetParent.getBoundingClientRect()
			refPos.left = rect.left - parentRect.left
			refPos.top = rect.top - parentRect.top
			break

		default:
			refPos.left = rect.left - $link.offsetParent.offsetLeft + window.pageXOffset
			refPos.top = rect.top - $link.offsetParent.offsetTop + window.pageYOffset
	}

	cornerPos.left = refPos.left
	switch (p1) {
		case 'center':
			cornerPos.left += refSize.width / 2
			break

		case 'right':
			cornerPos.left += refSize.width
			break
	}

	cornerPos.top = refPos.top
	switch (p2) {
		case 'center':
			cornerPos.top += refSize.height / 2
			break
		case 'bottom':
			cornerPos.top += refSize.height
			break
	}

	switch (p3) {
		case 'left':
			outStyle.left = Math.round(cornerPos.left)
			origin.left = 'left'
			break

		case 'center':
			outStyle.left = Math.round(cornerPos.left - dpSize.width / 2)
			origin.left = 'center'
			break

		default:
			outStyle.left = Math.round(cornerPos.left - dpSize.width)
			origin.left = 'right'
	}

	switch (p4) {
		case 'top':
			outStyle.top = Math.round(cornerPos.top)
			origin.top = 'top'
			break

		case 'center':
			outStyle.top = Math.round(cornerPos.top - dpSize.height / 2)
			origin.top = 'center'
			break

		default:
			outStyle.top = Math.round(cornerPos.top - dpSize.height)
			origin.top = 'bottom'
	}

	outStyle.left = (outStyle.left + margin[0]) + 'px'
	outStyle.top = (outStyle.top + margin[1]) + 'px'
	outStyle.transformOrigin = origin.left + ' ' + origin.top
	outStyle.position = 'absolute'
	return outStyle
}

const getWindow = () => window.document

export default {
	name: 'VueMyDropdown',

	data() {
		return {
			ddStyle: {}
		}
	},

	props: {
		// Dropdown visibility.
		visible: {
			required: true,
			type    : Boolean
		},
		// Dropdown position.
		position: {
			required: false,
			type    : Array,
			default : () => ['right', 'top', 'left', 'top']
		},
		// Dropdown animation.
		animation: {
			required: false,
			type    : String,
			default : 'ani-slide'
		}
	},

	methods: {
		open() {
			this.setPosition()
			getWindow().addEventListener('resize', this.resizeEvent)
			setTimeout(() => getWindow().addEventListener('click', this.clickOutEvent), 10)
		},

		close() {
			getWindow().removeEventListener('resize', this.resizeEvent)
			getWindow().removeEventListener('click', this.clickOutEvent)
		},

		resizeEvent() {
			this.setPosition()
		},

		clickOutEvent(evt) {
			var $dd = this.$el.children[1]
			if (evt.target !== $dd && !$dd.contains(evt.target)) {
				this.$emit('clickout', evt)
			}
		},

		setPosition() {
			var $link = this.$el.children[0]
			var $dd = this.$el.children[1]
			this.ddStyle = setPosition($link, $dd, this.position, [0, 20])
			this.$emit('positioned', this.ddStyle)
		}
	},

	watch: {
		visible(isVisible) {
			if (isVisible) {
				this.open()
			} else {
				this.close()
			}
		}
	},

	mounted() {
		if (this.visible) {
			this.open()
		}
	},

	destroyed() {
		getWindow().removeEventListener('resize', this.resizeEvent)
		getWindow().removeEventListener('click', this.clickOutEvent)
	}
}
</script>
