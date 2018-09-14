import path from "path";
import jsonDataFile from "./utils/jsonDataFile";

import Library from "./models/library";
var baseLibrary = new Library();

import ImageBldr from "./models/image";
import NoteBldr from "./models/note";
import FolderBldr from "./models/folder";
import RackBldr from "./models/rack";

const Image = ImageBldr(baseLibrary);
const NoteModels = NoteBldr(baseLibrary);
const FolderModels = FolderBldr(baseLibrary);
const RackModels = RackBldr(baseLibrary);

const Note = NoteModels.Note;
const EncryptedNote = NoteModels.EncryptedNote;
const Outline = NoteModels.Outline;
const OutNode = NoteModels.OutNode;
const Folder = FolderModels.Folder;
const Rack = RackModels.Rack;

export default {
	Image         : Image,
	Note          : Note,
	EncryptedNote : EncryptedNote,
	Outline       : Outline,
	Folder        : Folder,
	Rack          : Rack,
	getBaseLibraryPath() {
		return baseLibrary.baseLibraryPath;
	},
	setBaseLibraryPath(path) {
		baseLibrary.baseLibraryPath = path;
		return path;
	},
	doesLibraryExists() {
		return baseLibrary.baseLibraryPath && baseLibrary.doesLibraryExists();
	},
	resetHistory() {
		jsonDataFile.removeKey(path.join(baseLibrary.baseLibraryPath, ".library.json"), "history");
	},
	setLibraryToInitial() {
		baseLibrary.baseLibraryPath = baseLibrary.initialLibrary();
	},
	copyData(source, target) {
		return Library.moveLibrary(source, target);
	}
};
