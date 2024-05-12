IMAGE_NAME := wasmpp
RUN ?= sh

OPTS := $(shell ls -1 | while read item ; do echo "-v \"$(CURDIR)/$$item\":\"/app/$$item\"" ; done)
# OPTS += $(shell for p in `echo "$(PORTS)" | tr " " "\n"` ; do echo "-p $$p:$$p" ; done)

.PHONY: build run rmi prune

build: rmi
	docker build -t $(IMAGE_NAME) .
	@set -e ;\
	 CONTAINER_ID=`docker create $(IMAGE_NAME)` ;\
	 docker cp $${CONTAINER_ID}:/app/package-lock.json . ;\
	 docker rm -v $${CONTAINER_ID}

run:
	docker run --rm -it $(OPTS) $(IMAGE_NAME) $(RUN)

rmi:
	@docker rmi `docker images -q -a $(IMAGE_NAME)` 2> /dev/null || true

prune:
	docker system prune -a
