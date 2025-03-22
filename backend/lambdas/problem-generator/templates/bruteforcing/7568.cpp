// BOJ - 7568 덩치

#include <iostream>

using namespace std;

struct ab {
    int a, b;
    int rank;
    bool operator<(const ab X)
    {
        return (a < X.a) && (b < X.b);
    }
    bool operator>(const ab X)
    {
        return (a > X.a) && (b > X.b);
    }
};
int main()
{
    int n; cin >> n;
    ab p[n];
    for(int i = 0; i < n; i++)
    {
        int a, b; cin >> a >> b;
        p[i].a = a; p[i].b = b;
    }

    for(int i = 0; i < n; i++)
    {
        int cnt = 0;

        for(int j = 0; j < n; j++)
            if(i != j & p[i] < p[j])
                cnt++;

        p[i].rank = ++cnt;
    }

    for(int i = 0; i < n; i++)
        cout << p[i].rank << ' ';

}