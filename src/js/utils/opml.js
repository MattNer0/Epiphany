import xmldoc from "xmldoc";
import moment from "moment";
import uid from "./uid";

String.prototype.formatUnicorn = String.prototype.formatUnicorn || function() {
	var str = this.toString();
	if (arguments.length) {
		var t = typeof arguments[0];
		var key;
		var args = (t === 'string' || t === 'number') ? Array.prototype.slice.call(arguments) : arguments[0];

		for (key in args) {
			str = str.replace(new RegExp('\\{' + key + '\\}', 'gi'), args[key]);
		}
	}
	return str;
};

export default {

	parseFile(file_content, outline_obj) {
		var self = this;
		if (file_content == '') return;

		var doc = new xmldoc.XmlDocument(file_content);
		var head = doc.descendantWithPath('head');

		var metadata = {
			createdAt: moment(head.valueWithPath('dateCreated')).format('YYYY-MM-DD HH:mm:ss'),
			updatedAt: moment(head.valueWithPath('dateModified')).format('YYYY-MM-DD HH:mm:ss')
		};

		outline_obj.title = head.valueWithPath('title');
		outline_obj.metadata = metadata;

		outline_obj.nodes = doc.descendantWithPath('body').childrenNamed('outline').map(function(node) {
			return self.parse_nodes(node, outline_obj);
		});
	},

	parse_nodes(node, outline_obj) {
		var self = this;
		return outline_obj.generateNewNode(
			node.attr.text,
			node.attr.content,
			node.childrenNamed('outline').map(function(node) {
				return self.parse_nodes(node, outline_obj);
			})
		);
	},

	stringify_nodes(node) {
		var oarray = [];
		oarray.push('<outline text="{title}" content="{content}">'.formatUnicorn({
			title: node.title,
			content: node.content ? node.content : '',
		}));
		for (var i = 0; i < node.children.length; i++) {
			oarray = oarray.concat(this.stringify_nodes(node.getChildAt(i)));
		}
		oarray.push('</outline>');
		return oarray;
	},

	stringify(title, metadata, nodes_array) {
		var oarray = [];

		oarray.push('<?xml version="1.0" encoding="UTF-8"?>');
		oarray.push('<opml version="2.0">');
		oarray.push('<head>');
		oarray.push('<title>{title}</title>'.formatUnicorn({ title: title }));
		if (metadata.createdAt) {
			oarray.push('<dateCreated>{date}</dateCreated>'.formatUnicorn({ date: metadata.createdAt }));
		}
		if (metadata.updatedAt) {
			oarray.push('<dateModified>{date}</dateModified>'.formatUnicorn({ date: metadata.updatedAt }));
		}
		oarray.push('</head>');
		oarray.push('<body>');
		for (var i = 0; i < nodes_array.length; i++) {
			oarray = oarray.concat(this.stringify_nodes(nodes_array[i]));
		}
		oarray.push('</body>');
		oarray.push('</opml>');
		return oarray.join('\n');
	}
}