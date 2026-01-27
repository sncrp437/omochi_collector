/* eslint-disable @typescript-eslint/no-explicit-any */
import { Typography } from "antd";
import { useTranslation } from "react-i18next";
import { Fragment } from "react/jsx-runtime";

const { Text, Title } = Typography;

const TermsOfServiceContent = () => {
  const { t } = useTranslation();

  const DATA_TERMS = {
    title: t("policy.terms_title"),
    description: t("policy.terms_content.description"),
    listContent: [
      {
        id: 1,
        label: t("policy.terms_content.sections.section_1.label"),
        list: [
          {
            id: 1,
            content: t("policy.terms_content.sections.section_1.items.0"),
          },
          {
            id: 2,
            content: t("policy.terms_content.sections.section_1.items.1"),
          },
        ],
      },
      {
        id: 2,
        label: t("policy.terms_content.sections.section_2.label"),
        list: [
          {
            id: 1,
            content: t("policy.terms_content.sections.section_2.items.0"),
          },
          {
            id: 2,
            content: t("policy.terms_content.sections.section_2.items.1"),
          },
          {
            id: 3,
            content: t("policy.terms_content.sections.section_2.items.2"),
          },
          {
            id: 4,
            content: t("policy.terms_content.sections.section_2.items.3"),
          },
        ],
      },
      {
        id: 3,
        label: t("policy.terms_content.sections.section_3.label"),
        list: [
          {
            id: 1,
            content: t("policy.terms_content.sections.section_3.items.0"),
          },
          {
            id: 2,
            content: t("policy.terms_content.sections.section_3.items.1"),
          },
          {
            id: 3,
            content: t("policy.terms_content.sections.section_3.items.2"),
          },
          {
            id: 4,
            content: t("policy.terms_content.sections.section_3.items.3"),
          },
          {
            id: 5,
            content: t("policy.terms_content.sections.section_3.items.4"),
          },
          {
            id: 6,
            content: t("policy.terms_content.sections.section_3.items.5"),
          },
        ],
      },
      {
        id: 4,
        label: t("policy.terms_content.sections.section_4.label"),
        list: [
          {
            id: 1,
            content: t("policy.terms_content.sections.section_4.items.0"),
          },
          {
            id: 2,
            content: t("policy.terms_content.sections.section_4.items.1"),
          },
        ],
      },
      {
        id: 5,
        label: t("policy.terms_content.sections.section_5.label"),
        list: [
          {
            id: 1,
            content: t("policy.terms_content.sections.section_5.items.0"),
          },
          {
            id: 2,
            content: t("policy.terms_content.sections.section_5.items.1"),
          },
          {
            id: 3,
            content: t("policy.terms_content.sections.section_5.items.2"),
          },
        ],
      },
      {
        id: 6,
        label: t("policy.terms_content.sections.section_6.label"),
        list: [
          {
            id: 1,
            content: t("policy.terms_content.sections.section_6.items.0"),
          },
          {
            id: 2,
            content: t("policy.terms_content.sections.section_6.items.1"),
          },
          {
            id: 3,
            content: t("policy.terms_content.sections.section_6.items.2"),
          },
          {
            id: 4,
            content: t("policy.terms_content.sections.section_6.items.3"),
          },
          {
            id: 5,
            content: t("policy.terms_content.sections.section_6.items.4"),
          },
        ],
      },
      {
        id: 7,
        label: t("policy.terms_content.sections.section_7.label"),
        list: [
          {
            id: 1,
            content: t("policy.terms_content.sections.section_7.items.0"),
            note: t("policy.terms_content.sections.section_7.note"),
            list_note: [
              {
                id: 1,
                content: t(
                  "policy.terms_content.sections.section_7.note_items.0"
                ),
              },
            ],
          },
          {
            id: 2,
            content: t("policy.terms_content.sections.section_7.items.1"),
          },
          {
            id: 3,
            content: t("policy.terms_content.sections.section_7.items.2"),
          },
        ],
      },
      {
        id: 8,
        label: t("policy.terms_content.sections.section_8.label"),
        description: t("policy.terms_content.sections.section_8.description"),
        list: [],
      },
      {
        id: 9,
        label: t("policy.terms_content.sections.section_9.label"),
        list: [
          {
            id: 1,
            content: t("policy.terms_content.sections.section_9.items.0"),
          },
          {
            id: 2,
            content: t("policy.terms_content.sections.section_9.items.1"),
          },
        ],
      },
      {
        id: 10,
        label: t("policy.terms_content.sections.section_10.label"),
        description: t("policy.terms_content.sections.section_10.description"),
        list: [],
      },
      {
        id: 11,
        label: t("policy.terms_content.sections.section_11.label"),
        list: [
          {
            id: 1,
            content: t("policy.terms_content.sections.section_11.items.0"),
          },
          {
            id: 2,
            content: t("policy.terms_content.sections.section_11.items.1"),
          },
        ],
      },
      {
        id: 12,
        label: t("policy.terms_content.sections.section_12.label"),
        description: t("policy.terms_content.sections.section_12.description"),
        list: [
          {
            id: 1,
            content: t("policy.terms_content.sections.section_12.items.0"),
          },
          {
            id: 2,
            content: t("policy.terms_content.sections.section_12.items.1"),
          },
          {
            id: 3,
            content: t("policy.terms_content.sections.section_12.items.2"),
          },
          {
            id: 4,
            content: t("policy.terms_content.sections.section_12.items.3"),
          },
          {
            id: 5,
            content: t("policy.terms_content.sections.section_12.items.4"),
          },
          {
            id: 6,
            content: t("policy.terms_content.sections.section_12.items.5"),
          },
          {
            id: 7,
            content: t("policy.terms_content.sections.section_12.items.6"),
          },
          {
            id: 8,
            content: t("policy.terms_content.sections.section_12.items.7"),
          },
          {
            id: 9,
            content: t("policy.terms_content.sections.section_12.items.8"),
          },
        ],
      },
      {
        id: 13,
        label: t("policy.terms_content.sections.section_13.label"),
        description: t("policy.terms_content.sections.section_13.description"),
        list: [],
      },
      {
        id: 14,
        label: t("policy.terms_content.sections.section_14.label"),
        description: t("policy.terms_content.sections.section_14.description"),
        list: [
          {
            id: 1,
            content: t("policy.terms_content.sections.section_14.items.0"),
          },
          {
            id: 2,
            content: t("policy.terms_content.sections.section_14.items.1"),
          },
          {
            id: 3,
            content: t("policy.terms_content.sections.section_14.items.2"),
          },
        ],
      },
      {
        id: 15,
        label: t("policy.terms_content.sections.section_15.label"),
        description: "",
        list: [
          {
            id: 1,
            content: t("policy.terms_content.sections.section_15.items.0"),
            list_note: [
              {
                id: 1,
                content: t(
                  "policy.terms_content.sections.section_15.prohibited_items.0"
                ),
              },
              {
                id: 2,
                content: t(
                  "policy.terms_content.sections.section_15.prohibited_items.1"
                ),
              },
              {
                id: 3,
                content: t(
                  "policy.terms_content.sections.section_15.prohibited_items.2"
                ),
              },
              {
                id: 4,
                content: t(
                  "policy.terms_content.sections.section_15.prohibited_items.3"
                ),
              },
              {
                id: 5,
                content: t(
                  "policy.terms_content.sections.section_15.prohibited_items.4"
                ),
              },
              {
                id: 6,
                content: t(
                  "policy.terms_content.sections.section_15.prohibited_items.5"
                ),
              },
              {
                id: 7,
                content: t(
                  "policy.terms_content.sections.section_15.prohibited_items.6"
                ),
              },
              {
                id: 8,
                content: t(
                  "policy.terms_content.sections.section_15.prohibited_items.7"
                ),
              },
              {
                id: 9,
                content: t(
                  "policy.terms_content.sections.section_15.prohibited_items.8"
                ),
              },
              {
                id: 10,
                content: t(
                  "policy.terms_content.sections.section_15.prohibited_items.9"
                ),
              },
              {
                id: 11,
                content: t(
                  "policy.terms_content.sections.section_15.prohibited_items.10"
                ),
              },
            ],
          },
          {
            id: 2,
            content: t("policy.terms_content.sections.section_15.items.1"),
            list_note: [],
          },
        ],
      },
      {
        id: 16,
        label: t("policy.terms_content.sections.section_16.label"),
        description: "",
        list: [
          {
            id: 1,
            content: t("policy.terms_content.sections.section_16.items.0"),
          },
          {
            id: 2,
            content: t("policy.terms_content.sections.section_16.items.1"),
          },
          {
            id: 3,
            content: t("policy.terms_content.sections.section_16.items.2"),
          },
          {
            id: 4,
            content: t("policy.terms_content.sections.section_16.items.3"),
          },
          {
            id: 5,
            content: t("policy.terms_content.sections.section_16.items.4"),
          },
          {
            id: 6,
            content: t("policy.terms_content.sections.section_16.items.5"),
          },
        ],
      },
      {
        id: 17,
        label: t("policy.terms_content.sections.section_17.label"),
        description: t("policy.terms_content.sections.section_17.description"),
        list: [],
      },
      {
        id: 18,
        label: t("policy.terms_content.sections.section_18.label"),
        description: t("policy.terms_content.sections.section_18.description"),
        list: [],
      },
      {
        id: 19,
        label: t("policy.terms_content.sections.section_19.label"),
        description: t("policy.terms_content.sections.section_19.description"),
        list: [],
      },
    ],
  };

  return (
    <Fragment>
      {/* H1 for SEO - Page title */}
      <Title
        level={1}
        className="!absolute !w-px !h-px !p-0 !-m-px !overflow-hidden !whitespace-nowrap !border-0"
        style={{ clip: "rect(0, 0, 0, 0)", clipPath: "inset(50%)" }}
      >
        {t("policy.terms_title")} - Omochi
      </Title>

      <Text className="text-sm-white">{t("policy.terms_subtitle")}</Text>
      <Text className="text-sm-white">{DATA_TERMS.description}</Text>

      <div className="flex flex-col gap-4">
        {DATA_TERMS.listContent.map((term) => {
          const { label, description, list = [] } = term;
          return (
            <div key={term.id} className="leading-[1.2em] flex flex-col">
              <Title
                level={2}
                className="text-sm-white !break-all !font-bold !m-0 !mb-2"
              >
                {label}
              </Title>
              {description && (
                <Text
                  className={`text-sm-white ${
                    description && list.length ? "!pb-4" : ""
                  }`}
                >
                  {description}
                </Text>
              )}
              <div className="flex flex-col gap-4">
                {list?.map((item) => {
                  const { content, note = "", list_note = [] } = item as any;
                  return (
                    <div className="flex flex-col" key={item.id}>
                      <Text className="text-sm-white">{content}</Text>
                      {note && <Text className="text-sm-white">{note}</Text>}
                      {list_note && list_note.length > 0 && (
                        <div
                          className={`flex flex-col gap-4 ${
                            !note ? "!pt-4" : ""
                          }`}
                        >
                          {list_note?.map(
                            (data: { id: number; content: string }) => (
                              <Text key={data.id} className="text-sm-white">
                                {data.content}
                              </Text>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Fragment>
  );
};

export default TermsOfServiceContent;
