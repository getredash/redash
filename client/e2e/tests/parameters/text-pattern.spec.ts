import { expect, test, uniqueName } from "../../support/fixtures";
import { byTest, createQueryViaApi, retype } from "../../support/ui";
import {
  apply,
  chooseType,
  confirmSettings,
  dialog,
  dialogHelp,
  expectPending,
  expectRows,
  field,
  openSettings,
  openSource,
  parameter,
  runError,
  savedParameters,
  typeValue,
  valueInput,
} from "./helpers";

const PATTERN = "^[A-Z]{2}$";

test.describe("Text Pattern parameter", () => {
  test("the dialog validates the regex; matching values run, a value that does not match is dropped on apply", async ({
    page,
    api,
    seed,
  }) => {
    const { id } = await createQueryViaApi(api, {
      name: uniqueName("P text pattern"),
      dataSourceId: seed.dataSources.postgres,
      sql: "select name, country_code from cities where country_code = '{{ cc }}' order by 1",
      options: { parameters: [parameter({ name: "cc", value: "IL" })] },
    });
    await openSource(page, id);
    await expectRows(page, [{ name: "Tel Aviv", country_code: "IL" }]);

    await openSettings(page, "cc");
    await chooseType(page, "Text Pattern");
    const regex = byTest(page, "RegexPatternInput");
    await regex.click();
    await page.keyboard.type("[A-");
    await expect(dialogHelp(page)).toHaveText("Invalid Regex Pattern");
    await expect(regex).toHaveClass(/input-error/);
    await retype(page, PATTERN);
    await expect(regex).toHaveValue(PATTERN);
    await expect(dialogHelp(page)).toHaveText("Valid Regex Pattern");
    await expect(regex).not.toHaveClass(/input-error/);
    await confirmSettings(page);
    await expect
      .poll(async () => (await savedParameters(api, id))[0])
      .toMatchObject({ type: "text-pattern", regex: PATTERN });

    await typeValue(page, "cc", "FR");
    await expectPending(page, 1);
    await field(page, "cc").hover();
    await expect(page.locator(".ant-tooltip:not(.ant-tooltip-hidden)")).toHaveText(`Regex to match: ${PATTERN}`);
    await apply(page);
    await expectRows(page, [{ name: "Paris", country_code: "FR" }]);
    await expect(page).toHaveURL(/[?&]p_cc=FR(&|$)/);

    // A value that does not match can be typed, but applying empties the field and nothing runs
    await typeValue(page, "cc", "fr1");
    await expect(field(page, "cc")).toHaveValue("fr1");
    await expect(valueInput(page, "cc")).toHaveAttribute("data-dirty", "true");
    await apply(page);
    await expect(field(page, "cc")).toHaveValue("");
    await expect(runError(page)).toContainText("missing value for cc parameter");

    await typeValue(page, "cc", "DE");
    await apply(page);
    await expectRows(page, [{ name: "Berlin", country_code: "DE" }]);
    await expect(runError(page)).toHaveCount(0);

    // The same check applies to values that come with the URL
    await openSource(page, id, "?p_cc=nope");
    await expect(field(page, "cc")).toHaveValue("");
    await expect(runError(page)).toContainText("missing value for cc parameter");
    await openSource(page, id, "?p_cc=JP");
    await expect(field(page, "cc")).toHaveValue("JP");
    await expectRows(page, [{ name: "Tokyo", country_code: "JP" }]);

    await openSettings(page, "cc");
    await expect(byTest(dialog(page), "ParameterTypeSelect").locator(".ant-select-selection-item")).toHaveText(
      "Text Pattern"
    );
    await expect(byTest(page, "RegexPatternInput")).toHaveValue(PATTERN);
  });
});
