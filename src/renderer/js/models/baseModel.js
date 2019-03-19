import uid from '../utils/uid'

class Model {
	constructor(data) {
		this.uid = data.uid || uid.timeUID()
	}

	get data() {
		return { uid: this.uid }
	}

	update(data) {
		this.uid = data.uid
	}

	static removeModelFromStorage(model) {
		model.remove()
	}

	static generateNewUID() {
		return uid.timeUID()
	}
}

export default Model
