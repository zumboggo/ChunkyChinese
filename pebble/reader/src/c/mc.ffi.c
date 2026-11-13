/* FFI GENERATED FILE; DO NOT EDIT! */

#include "xsffi.h"

txAPI* XS = NULL;

extern void showPortrait(uint32_t arg0, uint32_t arg1);
extern void showScene(uint32_t arg0);
extern uint32_t sceneSelect();
extern void setBackgroundMotion(uint32_t arg0);
extern uint32_t storySize();
extern char* readStoryNode(uint32_t arg0);
extern char* readStory(uint32_t arg0, uint32_t arg1);

static void xs_showPortrait(txMachine* the) {
	uint32_t arg0 = (uint32_t)XS->toUnsigned(the, mxArgv(0));
	uint32_t arg1 = (uint32_t)XS->toUnsigned(the, mxArgv(1));
	showPortrait(arg0, arg1);
}

static void xs_showScene(txMachine* the) {
	uint32_t arg0 = (uint32_t)XS->toUnsigned(the, mxArgv(0));
	showScene(arg0);
}

static void xs_sceneSelect(txMachine* the) {
	uint32_t result = sceneSelect();
	XS->fromUnsigned(the, mxResult, (txUnsigned)result);
}

static void xs_setBackgroundMotion(txMachine* the) {
	uint32_t arg0 = (uint32_t)XS->toUnsigned(the, mxArgv(0));
	setBackgroundMotion(arg0);
}

static void xs_storySize(txMachine* the) {
	uint32_t result = storySize();
	XS->fromUnsigned(the, mxResult, (txUnsigned)result);
}

static void xs_readStoryNode(txMachine* the) {
	uint32_t arg0 = (uint32_t)XS->toUnsigned(the, mxArgv(0));
	char* result = readStoryNode(arg0);
	if (result) {
		XS->fromString(the, mxResult, (txString)result);
		free(result);
	} else {
		XS->abort(the, XS_NOT_ENOUGH_MEMORY_EXIT);
	}
}

static void xs_readStory(txMachine* the) {
	uint32_t arg0 = (uint32_t)XS->toUnsigned(the, mxArgv(0));
	uint32_t arg1 = (uint32_t)XS->toUnsigned(the, mxArgv(1));
	char* result = readStory(arg0, arg1);
	if (result) {
		XS->fromString(the, mxResult, (txString)result);
		free(result);
	} else {
		XS->abort(the, XS_NOT_ENOUGH_MEMORY_EXIT);
	}
}

void fxBuildFFI(txMachine* the, txAPI* api) {
	XS = api;
	XS->newHostFunction(the, xs_showPortrait, 2, 0, 0);
	XS->push(the, mxThis);
	XS->defineID(the, XS->id(the, "showPortrait"), 0, 0x0E);
	XS->pop(the);
	XS->newHostFunction(the, xs_showScene, 1, 0, 0);
	XS->push(the, mxThis);
	XS->defineID(the, XS->id(the, "showScene"), 0, 0x0E);
	XS->pop(the);
	XS->newHostFunction(the, xs_sceneSelect, 0, 0, 0);
	XS->push(the, mxThis);
	XS->defineID(the, XS->id(the, "sceneSelect"), 0, 0x0E);
	XS->pop(the);
	XS->newHostFunction(the, xs_setBackgroundMotion, 1, 0, 0);
	XS->push(the, mxThis);
	XS->defineID(the, XS->id(the, "setBackgroundMotion"), 0, 0x0E);
	XS->pop(the);
	XS->newHostFunction(the, xs_storySize, 0, 0, 0);
	XS->push(the, mxThis);
	XS->defineID(the, XS->id(the, "storySize"), 0, 0x0E);
	XS->pop(the);
	XS->newHostFunction(the, xs_readStoryNode, 1, 0, 0);
	XS->push(the, mxThis);
	XS->defineID(the, XS->id(the, "readStoryNode"), 0, 0x0E);
	XS->pop(the);
	XS->newHostFunction(the, xs_readStory, 2, 0, 0);
	XS->push(the, mxThis);
	XS->defineID(the, XS->id(the, "readStory"), 0, 0x0E);
	XS->pop(the);
}
