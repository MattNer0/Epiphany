import moment from 'moment'
import arr from '../utils/arr'

const TODAY_TEXT = 'Today'
const YESTERDAY_TEXT = 'Yesterday'
const WEEK_AGO_TEXT = 'A Week Ago'

export default function(Vue) {
	Vue.filter('dateSeparated', function(notes, property) {
		if (notes.length === 0) {
			return [{
				dateStr: 'No notes, let\'s write',
				notes  : []
			}]
		}
		if (property === 'title') {
			return [{
				dateStr: '',
				notes  : arr.sortBy(notes.slice(), property, true)
			}]
		}
		var now = moment()
		var sorted = arr.sortBy(notes.slice(), property)

		/**
		 * @function getDateDiff
		 * @param  {Object} to   moment datetime object
		 * @param  {Object} from moment datetime object
		 * @return {Number} difference number in days
		 */
		function getDateDiff(to, from) {
			var t = moment([to.year(), to.month(), to.date()])
			var f = moment([from.year(), from.month(), from.date()])
			return t.diff(f, 'days')
		}

		/**
		 * @function getDateStr
		 * @param  {Object} d moment datetime object
		 * @return {String} Formatted string
		 */
		function getDateStr(d) {
			var diff = getDateDiff(now, d)
			if (diff === 0) {
				return TODAY_TEXT
			} else if (diff === 1) {
				return YESTERDAY_TEXT
			} else if (diff === 7) {
				return WEEK_AGO_TEXT + ' (' + d.format('MMM DD') + ')'
			}
			return d.format('ddd, MMM DD')
		}

		var ret = []
		var lastDate = null
		sorted.forEach((note) => {
			if (!lastDate) {
				lastDate = {
					dateStr: getDateStr(note[property]),
					date   : note[property],
					notes  : [note]
				}
			} else if (getDateDiff(lastDate.date, note[property]) > 0) {
				ret.push(lastDate)
				lastDate = {
					dateStr: getDateStr(note[property]),
					date   : note[property],
					notes  : [note]
				}
			} else {
				lastDate.notes.push(note)
			}
		})
		ret.push(lastDate)
		return ret
	})
};
