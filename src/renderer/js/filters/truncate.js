export default function(Vue) {
	Vue.filter('truncate', function(value, len) {
		if (value && value.length > len) {
			return value.slice(0, len) + '...'
		}
		return value
	})
}
