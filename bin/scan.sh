#!/bin/bash

./dropbox_scanner --verbose --subset=tiles/bases --upload > ../openforge/db/fixtures/bases.json.next
./dropbox_scanner --verbose --subset=tiles/cut-stone --upload > ../openforge/db/fixtures/cut-stone.json.next
./dropbox_scanner --verbose --subset=tiles/dungeon_stone --upload > ../openforge/db/fixtures/dungeon_stone.json.next
