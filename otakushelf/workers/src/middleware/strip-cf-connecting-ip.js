function stripCloudflareHeaders(input, init) {
	const request = new Request(input, init);
	request.headers.delete("CF-Connecting-IP");
	request.headers.delete("CF-Worker");
	request.headers.delete("CF-Worker-Subrequest");
	request.headers.delete("CF-EW-Via");
	request.headers.delete("CF-IPCountry");
	return request;
}

globalThis.fetch = new Proxy(globalThis.fetch, {
	apply(target, thisArg, argArray) {
		return Reflect.apply(target, thisArg, [
			stripCloudflareHeaders.apply(null, argArray),
		]);
	},
});
