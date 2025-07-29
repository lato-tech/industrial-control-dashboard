from librpiplc import rpiplc
rpiplc.init("RPIPLC_V6", "RPIPLC_58")

def digital_read_write(rr, boolV):
	outV = rpiplc.LOW
	if(boolV):
		outV = rpiplc.HIGH
	rpiplc.pin_mode(rr, rpiplc.OUTPUT)
    print(rr, boolV)
	rpiplc.digital_write(rr, outV)


