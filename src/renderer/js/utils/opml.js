import xmldoc from 'xmldoc'
import moment from 'moment'

function formatUnicorn() {
	let str
	if (arguments.length) {
		str = arguments[0]
		var t = typeof arguments[1]
		var key
		var args = (t === 'string' || t === 'number') ? Array.prototype.slice.call(arguments) : arguments[1]

		for (key in args) {
			str = str.replace(new RegExp('\\{' + key + '\\}', 'gi'), args[key])
		}
	}
	return str
}

export default {

	parseFile(fileContent, outlineObj) {
		var self = this
		if (fileContent === '') return

		var doc = new xmldoc.XmlDocument(fileContent)
		var head = doc.descendantWithPath('head')

		var metadata = {
			createdAt: moment(head.valueWithPath('dateCreated')).format('YYYY-MM-DD HH:mm:ss'),
			updatedAt: moment(head.valueWithPath('dateModified')).format('YYYY-MM-DD HH:mm:ss')
		}

		outlineObj.title = head.valueWithPath('title')
		outlineObj.metadata = metadata

		outlineObj.nodes = doc.descendantWithPath('body').childrenNamed('outline').map(function(node) {
			return self.parse_nodes(node, outlineObj)
		})
	},

	parse_nodes(node, outlineObj) {
		var self = this
		return outlineObj.generateNewNode(
			node.attr.text,
			node.attr.content,
			node.childrenNamed('outline').map(function(node) {
				return self.parse_nodes(node, outlineObj)
			})
		)
	},

	stringify_nodes(node) {
		var oarray = []
		oarray.push(formatUnicorn('<outline text="{title}" content="{content}">', {
			title  : node.title,
			content: node.content ? node.content : ''
		}))
		for (var i = 0; i < node.children.length; i++) {
			oarray = oarray.concat(this.stringify_nodes(node.getChildAt(i)))
		}
		oarray.push('</outline>')
		return oarray
	},

	stringify(title, metadata, nodesArray) {
		var oarray = []
		oarray.push('<?xml version="1.0" encoding="UTF-8"?>')
		oarray.push('<opml version="2.0">')
		oarray.push('<head>')
		oarray.push(formatUnicorn('<title>{title}</title>', { title: title }))
		if (metadata.createdAt) {
			oarray.push(formatUnicorn('<dateCreated>{date}</dateCreated>', { date: metadata.createdAt }))
		}
		if (metadata.updatedAt) {
			oarray.push(formatUnicorn('<dateModified>{date}</dateModified>', { date: metadata.updatedAt }))
		}
		oarray.push('</head>')
		oarray.push('<body>')
		for (var i = 0; i < nodesArray.length; i++) {
			oarray = oarray.concat(this.stringify_nodes(nodesArray[i]))
		}
		oarray.push('</body>')
		oarray.push('</opml>')
		return oarray.join('\n')
	}
}
