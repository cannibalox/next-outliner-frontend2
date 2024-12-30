<template>
  <div class="flex items-center gap-2">
    <Select v-model="item.value.value">
      <SelectTrigger>
        <SelectValue
          class="text-muted-foreground"
          :placeholder="$t('kbView.fontSelector.notSpecified')"
        />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem
            v-for="(font, index) in FONT_NAMES"
            :key="index"
            :value="font"
            :style="{ fontFamily: font }"
          >
            <div class="flex items-center">
              <div>{{ font }}</div>
              <div v-if="!fontAvailability[index]" class="text-muted-foreground ml-2">
                {{ $t("kbView.fontSelector.notAvailable") }}
              </div>
            </div>
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
    <ResetButton :item="item" />
  </div>
</template>

<script setup lang="ts">
import type { SettingItem } from "@/context/settings";
import ResetButton from "./ResetButton.vue";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectGroup,
} from "../ui/select";
import { checkFontAvailability } from "@/utils/font";

defineProps<{
  item: SettingItem<string, "fontSelector">;
  fontList?: string[];
}>();

const FONT_NAMES = [
  // 系统常见字体
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Georgia",
  "Impact",
  "Palatino Linotype",
  "Century Gothic",
  "Gill Sans",
  "Lucida Sans Unicode",
  "Lucida Console",
  "Comic Sans MS",
  "Arial Black",
  "Garamond",
  "Franklin Gothic Medium",
  "Book Antiqua",
  "Calibri",
  "Cambria",
  "Candara",
  "Consolas",
  "Constantia",
  "Corbel",
  "Segoe UI",
  "Segoe Print",
  "Segoe Script",
  "Optima",
  "Rockwell",
  "Baskerville",
  "Didot",
  "Futura",
  "Geneva",
  "Courier",
  "Brush Script MT",
  "Hobo Std",
  "Papyrus",
  "MS Serif",
  "MS Sans Serif",

  // Google Fonts
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Source Sans Pro",
  "Poppins",
  "Raleway",
  "Merriweather",
  "Nunito",
  "Playfair Display",
  "Ubuntu",
  "Noto Sans",
  "Oswald",
  "PT Sans",
  "PT Serif",
  "Work Sans",
  "Cabin",
  "Quicksand",
  "Josefin Sans",
  "Droid Sans",
  "Inconsolata",
  "Lobster",
  "Pacifico",
  "Indie Flower",
  "Amatic SC",
  "Anton",
  "Abril Fatface",
  "Bitter",
  "Dancing Script",
  "Exo 2",
  "Fjalla One",
  "Karla",
  "Mulish",
  "Righteous",
  "Satisfy",
  "Shadows Into Light",
  "Signika",
  "Slabo 27px",
  "Zilla Slab",
  "Overpass",

  // 中文字体
  "Microsoft YaHei",
  "SimSun",
  "SimHei",
  "FangSong",
  "NSimSun",
  "STXihei",
  "STKaiti",
  "STSong",
  "STZhongsong",
  "STHupo",
  "STXinwei",
  "STLiti",
  "FangSong_GB2312",
  "YouYuan",
  "FZHei-B01S",
  "FZShuSong-Z01",
  "Source Han Sans",
  "Source Han Serif",

  // 特殊用途字体
  "Monospace",
  "Cursive",
];

const fontAvailability = checkFontAvailability(FONT_NAMES);
</script>
