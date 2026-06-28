import { MODULE_ID, TEMPLATES } from "../constants.js";
import { HeroEntryData } from "../data-models.js";
import { getRoster, setRoster, getRoles } from "../helpers.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * GM form for one roster entry's presentation: alternate image, aspect ratio and
 * the rich-text description shown on the selection screen.
 */
export class HeroEditorApp extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * @param {object} [options] Application options.
   * @param {string} options.actorId Id of the world Actor whose roster entry is edited.
   */
  constructor(options = {}) {
    super(options);
    this.#actorId = options.actorId;
  }

  /** @type {string} */
  #actorId;

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: [MODULE_ID, "hero-editor"],
    tag: "form",
    window: {
      title: "CYH.HeroEditor.Title",
      icon: "fa-solid fa-pen-to-square",
      resizable: true
    },
    position: { width: 760, height: "auto" },
    form: {
      handler: HeroEditorApp.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true
    }
  };

  /** @override */
  static PARTS = {
    body: { template: TEMPLATES.HERO_EDITOR }
  };

  /**
   * Append the hero name to the window title.
   * @override
   * @returns {string} The window title.
   */
  get title() {
    const name = game.actors.get(this.#actorId)?.name;
    const base = game.i18n.localize("CYH.HeroEditor.Title");
    return name ? `${base}: ${name}` : base;
  }

  /**
   * Build the render context. Field instances from {@link HeroEntryData} drive the
   * `{{formGroup}}` helpers, so the file picker and ProseMirror inputs come straight
   * from the schema definition.
   * @override
   * @param {object} options Render options.
   * @returns {Promise<object>} The template context.
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const entry = getRoster().find(e => e.actorId === this.#actorId);
    const assigned = entry?.roles ?? [];
    // One toggle per catalog role; checked reflects the hero's current (valid) tags.
    const roles = getRoles().map(r => ({ id: r.id, name: r.name, img: r.img, selected: assigned.includes(r.id) }));
    return Object.assign(context, {
      entry: entry?.toObject() ?? {},
      fields: HeroEntryData.schema.fields,
      roles
    });
  }

  /**
   * Wire each image field's live preview: when the FilePicker value changes, swap the
   * thumbnail next to it (or fall back to the empty placeholder). Attached here because
   * the part's DOM is replaced on every render. Called from `_onRender`.
   * @override
   * @param {object} context The render context.
   * @param {object} options Render options.
   * @returns {void}
   */
  _onRender(context, options) {
    super._onRender(context, options);
    for (const section of this.element.querySelectorAll(".image-section")) {
      const picker = section.querySelector("file-picker");
      const preview = section.querySelector(".image-preview");
      if (!picker || !preview) continue;
      picker.addEventListener("change", () => {
        const value = picker.value ?? "";
        preview.classList.toggle("empty", !value);
        preview.replaceChildren();
        if (value) {
          const img = document.createElement("img");
          img.src = value;
          img.alt = "";
          preview.append(img);
        } else {
          const icon = document.createElement("i");
          icon.className = "fa-solid fa-image";
          preview.append(icon);
        }
      });
    }
  }

  /**
   * Persist the edited presentation back into the roster setting.
   * Form handler declared in `DEFAULT_OPTIONS.form`; invoked with the app as `this`.
   * @param {SubmitEvent} event The form submission event.
   * @param {HTMLFormElement} form The form element.
   * @param {foundry.applications.ux.FormDataExtended} formData The parsed form data.
   * @returns {Promise<void>}
   */
  static async #onSubmit(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    const entries = getRoster().map(e => e.toObject());
    const entry = entries.find(e => e.actorId === this.#actorId);
    if (!entry) return;
    entry.img = data.img ?? "";
    entry.detailImg = data.detailImg ?? "";
    entry.description = data.description ?? "";
    entry.descriptionMode = data.descriptionMode ?? "inherit";
    // The role checkboxes are named `roleFlags.<id>`; keep the checked ids. Because only
    // current catalog roles render a checkbox, saving also prunes any deleted-role ids.
    entry.roles = Object.entries(data.roleFlags ?? {}).filter(([, on]) => on).map(([id]) => id);
    await setRoster(entries);
  }
}
