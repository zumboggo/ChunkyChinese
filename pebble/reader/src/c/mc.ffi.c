/* FFI GENERATED FILE; DO NOT EDIT! */

#include "xsffi.h"

txAPI* XS = NULL;

extern void showPortrait(uint32_t arg0, uint32_t arg1);

static void xs_showPortrait(txMachine* the) {
	uint32_t arg0 = (uint32_t)XS->toUnsigned(the, mxArgv(0));
	uint32_t arg1 = (uint32_t)XS->toUnsigned(the, mxArgv(1));
	showPortrait(arg0, arg1);
}

void fxBuildFFI(txMachine* the, txAPI* api) {
	XS = api;
	XS->newHostFunction(the, xs_showPortrait, 2, 0, 0);
	XS->push(the, mxThis);
	XS->defineID(the, XS->id(the, "showPortrait"), 0, 0x0E);
	XS->pop(the);
}
