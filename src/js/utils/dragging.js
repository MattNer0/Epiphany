export default {
	dragOverPercentage(element, clientY) {
		var rect = element.getBoundingClientRect();
		return (clientY - rect.top) / (rect.bottom - rect.top);
	},
	dragOverPercentageHorizontal(element, clientX) {
		var rect = element.getBoundingClientRect();
		return (clientX - rect.left) / (rect.right - rect.left);
	}
};
