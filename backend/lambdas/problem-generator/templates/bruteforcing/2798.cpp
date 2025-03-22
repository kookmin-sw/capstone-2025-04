// BOJ - 2798 블랙잭


#include <iostream>

using namespace std;

int main()
{
    int n, m; cin >> n >> m;
    int a[n] = {0, };
    int max = 0;

    for(int i = 0; i < n; i++) cin >> a[i];

    for(int i = 0; i < n; i++)
    {
        for(int j = i + 1; j < n; j++)
        {
            for(int k = j + 1; k < n; k++)
            {
                int sum = a[i] + a[j] + a[k];
                if(sum <= m && sum > max) max = sum;
            }
        }
    }

    cout << max;
}