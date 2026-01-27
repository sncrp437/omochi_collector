/* eslint-disable @typescript-eslint/no-explicit-any */
import { Divider, Table, Typography } from "antd";
import BaseCardInfo from "./BaseCardInfo";
import { useTranslation } from "react-i18next";
import { MenuItemTable } from "@/types/cart";
import { formatYenWithCurrency, getSummaryDataOrder } from "@/utils/helper";
import React, { useMemo } from "react";
import type { ColumnsType } from "antd/es/table";
import { Order } from "@/generated/api";

const { Text } = Typography;

interface OrderAmountDetailsProps {
  menuItemsTable: MenuItemTable[];
  orderDetail?: Order;
  summaryDataProps?: any[];
}

const OrderAmountDetails: React.FC<OrderAmountDetailsProps> = ({
  menuItemsTable,
  orderDetail,
  summaryDataProps = [],
}) => {
  const { t } = useTranslation();

  const orderDetailColumns: ColumnsType<MenuItemTable> = [
    {
      title: t("order.label.menu_item_name_label"),
      dataIndex: "name",
      key: "name",
      width: "50%",
      render: (text: string) => (
        <Text className="text-sm-white">{t(text)}</Text>
      ),
    },
    {
      title: t("order.label.menu_item_quantity_label"),
      dataIndex: "quantity",
      key: "quantity",
      align: "center",
      width: "25%",
      render: (text: string) => <Text className="text-sm-white">{text}</Text>,
    },
    {
      title: t("order.label.menu_item_subtotal_label"),
      dataIndex: "subtotal",
      key: "subtotal",
      width: "25%",
      render: (subtotal: number) => (
        <Text className="text-sm-white !font-bold">
          {formatYenWithCurrency(subtotal)}
        </Text>
      ),
      align: "right",
    },
  ];

  const summaryData = useMemo(() => {
    if (summaryDataProps?.length) return summaryDataProps;
    if (orderDetail) return getSummaryDataOrder(orderDetail);
    return [];
  }, [summaryDataProps, orderDetail]);

  const summaryColumns: ColumnsType<any> = [
    {
      key: "label",
      dataIndex: "label",
      render: (text: string) => (
        <Text className="text-sm-white">{t(text)}</Text>
      ),
    },
    {
      key: "value",
      dataIndex: "value",
      align: "right",
      render: (subtotal: number) => (
        <Text className="text-sm-white !font-bold">
          {formatYenWithCurrency(subtotal)}
        </Text>
      ),
    },
  ];

  return (
    <BaseCardInfo>
      <div className="flex flex-col gap-2 w-full">
        <Table
          dataSource={menuItemsTable}
          columns={orderDetailColumns}
          pagination={false}
          rowKey="name"
          bordered={false}
          size="small"
          className="!w-full custom-receipt-table"
          summary={() => null}
        />
        <Divider
          variant="dashed"
          className="!border-white !w-2/3 !min-w-2/3 !my-2 !mx-auto"
          dashed
        />
        <Table
          dataSource={summaryData}
          columns={summaryColumns}
          pagination={false}
          rowKey="key"
          bordered={false}
          size="small"
          className="!w-full custom-receipt-table"
          showHeader={false}
        />
      </div>
    </BaseCardInfo>
  );
};

export default OrderAmountDetails;
