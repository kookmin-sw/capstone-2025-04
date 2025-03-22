// BOJ - 11403 경로 찾기

#include <iostream>

using namespace std;

int main()
{
    int n; cin >> n;
    int arr[n][n] = {0, };
    for(int i = 0; i < n; i++)
        for(int j = 0; j < n; j++)
            cin >> arr[i][j];

    for(int k = 0; k < n; k++)
        for(int i = 0; i < n; i++)
            for(int j = 0; j < n; j++)
                if(arr[i][k] & arr[k][j])
                    arr[i][j] = 1;

    for(int i = 0; i < n; puts(""), i++)
        for(int j = 0; j < n; j++)
            cout << arr[i][j] << ' ';
}